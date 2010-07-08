var namespace = { window : {} };
utils.include('extensions.js', namespace, 'Shift_JIS');


var AM = {};
if ('@mozilla.org/addons/integration;1' in Cc)
	Components.utils.import('resource://gre/modules/AddonManager.jsm', AM);

var EM = ('@mozilla.org/extensions/manager;1' in Cc) ?
			Cc['@mozilla.org/extensions/manager;1'].getService(Ci.nsIExtensionManager) :
			null ;

var uxuLocation = utils.getFileFromKeyword('ProfD');
uxuLocation.append('extensions');
uxuLocation.append('uxu@clear-code.com');

var uxuVersion = '0.7.6+';

var disabledLocation = utils.getFileFromKeyword('ProfD');
disabledLocation.append('extensions');
disabledLocation.append('disabled@clear-code.com');

var disabledVersion = '0.1';

var sv;

function setUp()
{
	sv = {};
	sv.__proto__ = namespace.window['piro.sakura.ne.jp'].extensions;
}

function tearDown()
{
}


function test_isAvailable_sync()
{
	assert.isTrue(sv.isAvailable('uxu@clear-code.com'));
	assert.isFalse(sv.isAvailable('unknown@clear-code.com'));
	assert.isFalse(sv.isAvailable('disabled@clear-code.com'));
}

function test_isAvailable_async()
{
	var lastCalled = { value : null };
	sv.isAvailable('uxu@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ok', lastCalled.value);

	lastCalled.value = null;
	sv.isAvailable('unknown@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ng', lastCalled.value);

	lastCalled.value = null;
	sv.isAvailable('disabled@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ng', lastCalled.value);
}

function test_isInstalled_sync()
{
	assert.isTrue(sv.isInstalled('uxu@clear-code.com'));
	assert.isFalse(sv.isInstalled('unknown@clear-code.com'));
	assert.isTrue(sv.isAvailable('disabled@clear-code.com'));
}

function test_isInstalled_async()
{
	var lastCalled = { value : null };
	sv.isInstalled('uxu@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ok', lastCalled.value);

	lastCalled.value = null;
	sv.isInstalled('unknown@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ng', lastCalled.value);

	lastCalled.value = null;
	sv.isInstalled('disabled@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ok', lastCalled.value);
}

function test_isEnabled_sync()
{
	assert.isTrue(sv.isEnabled('uxu@clear-code.com'));
	assert.isFalse(sv.isEnabled('unknown@clear-code.com'));
	assert.isFalse(sv.isEnabled('disabled@clear-code.com'));
}

function test_isEnabled_async()
{
	var lastCalled = { value : null };
	sv.isEnabled('uxu@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ok', lastCalled.value);

	lastCalled.value = null;
	sv.isEnabled('unknown@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ng', lastCalled.value);

	lastCalled.value = null;
	sv.isEnabled('disabled@clear-code.com', {
		ok : function() { lastCalled.value = 'ok'; },
		ng : function() { lastCalled.value = 'ng'; }
	});
	utils.wait(lastCalled);
	assert.equals('ng', lastCalled.value);
}

function test_getInstalledLocation_sync()
{
	assert.equals(uxuLocation.path, sv.getInstalledLocation('uxu@clear-code.com').path);
	assert.isNull(sv.getInstalledLocation('unknown@clear-code.com'));
	assert.equals(disabledLocation.path, sv.getInstalledLocation('disabled@clear-code.com').path);
}

function test_getInstalledLocation_async()
{
	var lastFile = { value : void(0) };
	sv.getInstalledLocation('uxu@clear-code.com',
		function(aFile) { lastFile.value = aFile; });
	utils.wait(function() {
		return lastFile.value !== void(0);
	});
	assert.equals(uxuLocation.path, lastFile.value.path);

	lastFile.value = void(0);
	sv.getInstalledLocation('unknown@clear-code.com', 
		function(aFile) { lastFile.value = aFile; });
	utils.wait(function() {
		return lastFile.value !== void(0);
	});
	assert.isNull(lastFile.value);

	lastFile.value = null;
	sv.getInstalledLocation('disabled@clear-code.com',
		function(aFile) { lastFile.value = aFile; });
	utils.wait(function() {
		return lastFile.value !== void(0);
	});
	assert.equals(disabledLocation.path, lastFile.value.path);
}

function test_getVersion_sync()
{
	assert.equals(uxuVersion, sv.getVersion('uxu@clear-code.com'));
	assert.isNull(sv.getVersion('unknown@clear-code.com'));
	assert.equals(disabledVersion, sv.getVersion('disabled@clear-code.com'));
}

function test_getVersion_async()
{
	var lastVersion = { value : void(0) };
	sv.getVersion('uxu@clear-code.com',
		function(aVersion) { lastVersion.value = aVersion; });
	utils.wait(function() {
		return lastVersion.value !== void(0);
	});
	assert.equals(uxuVersion, lastVersion.value);

	lastVersion.value = void(0);
	sv.getVersion('unknown@clear-code.com', 
		function(aVersion) { lastVersion.value = aVersion; });
	utils.wait(function() {
		return lastVersion.value !== void(0);
	});
	assert.isNull(lastVersion.value);

	lastVersion.value = null;
	sv.getVersion('disabled@clear-code.com',
		function(aVersion) { lastVersion.value = aVersion; });
	utils.wait(function() {
		return lastVersion.value !== void(0);
	});
	assert.equals(disabledVersion, lastVersion.value);
}

/*
function test_goToOptions()
{
}

function test_goToOptionsNow()
{
}
*/
