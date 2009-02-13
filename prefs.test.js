var namespace = { window : {} };
utils.include('prefs.js', namespace, 'Shift_JIS');

var sv;
var random = parseInt(Math.random() * 65000);

function clearTestPrefs()
{
	utils.clearPref(random+'.bool');
	utils.clearPref(random+'.int');
	utils.clearPref(random+'.string');
	utils.clearPref(random+'.domain1.pref');
	utils.clearPref(random+'.domain2.pref');
	utils.clearPref(random+'.domain3.pref');
}

function setUp()
{
	sv = {};
	sv.__proto__ = namespace.window['piro.sakura.ne.jp'].prefs;
	clearTestPrefs();
}

function tearDown()
{
	clearTestPrefs();
}

function test_setAndGetPref()
{
	function assertSetAndGetPref(aPref, aValue)
	{
		assert.isNull(utils.getPref(aPref));
		assert.isNull(sv.getPref(aPref));

		sv.setPref(aPref, aValue);

		assert.isNotNull(utils.getPref(aPref));
		assert.equals(aValue, utils.getPref(aPref));

		assert.isNotNull(sv.getPref(aPref));
		assert.equals(aValue, sv.getPref(aPref));

		sv.clearPref(aPref);
		assert.isNull(utils.getPref(aPref));
		assert.isNull(sv.getPref(aPref));
	}

	assertSetAndGetPref(random+'.bool', true);
	assertSetAndGetPref(random+'.int', 29);
	assertSetAndGetPref(random+'.string', 'string');
}

function test_listeners()
{
	var singleDomainListener = {
			domain  : random+'.domain1',
			observe : function(aSubject, aTopic, aData)
			{
				this.messages.push([aTopic, aData]);
			},
			messages : []
		};

	var multipleDomainsListener = {
			domains : [
				random+'.domain2',
				random+'.domain3'
			],
			observe : function(aSubject, aTopic, aData)
			{
				this.messages.push([aTopic, aData]);
			},
			messages : []
		};

	sv.addPrefListener(singleDomainListener);
	utils.setPref(random+'.domain1.pref', true);
	utils.setPref(random+'.domain1.pref', false);
	assert.equals(
		[
			['nsPref:changed', random+'.domain1.pref'],
			['nsPref:changed', random+'.domain1.pref']
		],
		singleDomainListener.messages
	);
	singleDomainListener.messages = [];
	sv.removePrefListener(singleDomainListener);
	utils.setPref(random+'.domain1.pref', true);
	utils.setPref(random+'.domain1.pref', false);
	assert.equals([], singleDomainListener.messages);

	sv.addPrefListener(multipleDomainsListener);
	utils.setPref(random+'.domain2.pref', true);
	utils.setPref(random+'.domain3.pref', true);
	utils.setPref(random+'.domain2.pref', false);
	utils.setPref(random+'.domain3.pref', false);
	assert.equals(
		[
			['nsPref:changed', random+'.domain2.pref'],
			['nsPref:changed', random+'.domain3.pref'],
			['nsPref:changed', random+'.domain2.pref'],
			['nsPref:changed', random+'.domain3.pref']
		],
		multipleDomainsListener.messages
	);
	multipleDomainsListener.messages = [];
	sv.removePrefListener(multipleDomainsListener);
	utils.setPref(random+'.domain2.pref', true);
	utils.setPref(random+'.domain3.pref', true);
	utils.setPref(random+'.domain2.pref', false);
	utils.setPref(random+'.domain3.pref', false);
	assert.equals([], multipleDomainsListener.messages);
}
