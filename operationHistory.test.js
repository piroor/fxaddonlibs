var sv;
var win;

var windowSetUp = function() {
	yield Do(utils.setUpTestWindow());
	win = utils.getTestWindow();
};
var windowTearDown = function() {
	yield Do(utils.tearDownTestWindow());
	win = null;
};

function setUp()
{
	var namespace = {
			window : {
				utils : utils,
				addEventListener : function() {},
				removeEventListener : function() {}
			}
		};
	utils.include('operationHistory.js', namespace, 'Shift_JIS');
	sv = namespace.window['piro.sakura.ne.jp'].operationHistory;
	sv._tables = {};
}

function tearDown()
{
}

test_getWindowId.setUp = windowSetUp;
test_getWindowId.tearDown = windowTearDown;
function test_getWindowId()
{
	var id = sv.getWindowId(win);
	assert.isNotNull('', id);
	assert.notEquals('', id);

	var newId = sv.getWindowId(win);
	assert.equals(id, newId);
}

test_getWindowById.setUp = windowSetUp;
test_getWindowById.tearDown = windowTearDown;
function test_getWindowById()
{
	var id = sv.getWindowId(win);
	var windowFromId = sv.getWindowById(id);
	assert.equals(win, windowFromId);

	windowFromId = sv.getWindowById('does not exist!');
	assert.isNull(windowFromId);
}


test_addEntry.setUp = windowSetUp;
test_addEntry.tearDown = windowTearDown;
function test_addEntry()
{
	var name = 'foobar';

	// register global-anonymous
	sv.addEntry({ label : 'anonymous 1' });
	sv.addEntry({ label : 'anonymous 2' });
	sv.addEntry({ label : 'anonymous 3' });

	// register global-named
	sv.addEntry(name, { label : 'named 1' });
	sv.addEntry(name, { label : 'named 2' });
	sv.addEntry(name, { label : 'named 3' });

	// register window-anonymous
	sv.addEntry({ label : 'window, anonymous 1' }, win);
	sv.addEntry({ label : 'window, anonymous 2' }, win);
	sv.addEntry({ label : 'window, anonymous 3' }, win);

	// register window-named
	sv.addEntry(name, { label : 'window, named 1' }, win);
	sv.addEntry(name, { label : 'window, named 2' }, win);
	sv.addEntry(name, { label : 'window, named 3' }, win);

	function assertHistory(aLabels, aCurrentIndex, aHistory)
	{
		assert.equals(aLabels.length, aHistory.entries.length);
		assert.equals(aLabels,
		              aHistory.entries.map(function(aEntry) {
		                return aEntry.label;
		              }));
		assert.equals(aCurrentIndex, aHistory.index);
	}

	assertHistory(
		['anonymous 1',
		 'anonymous 2',
		 'anonymous 3'],
		2,
		sv.getHistory()
	);

	assertHistory(
		['named 1',
		 'named 2',
		 'named 3'],
		2,
		sv.getHistory(name)
	);

	assertHistory(
		['window, anonymous 1',
		 'window, anonymous 2',
		 'window, anonymous 3'],
		2,
		sv.getHistory(win)
	);

	assertHistory(
		['window, named 1',
		 'window, named 2',
		 'window, named 3'],
		2,
		sv.getHistory(name, win)
	);
}


function test_undoRedo()
{
	var log = [];

	sv.addEntry({ label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({ label : 'anonymous 2',
	              onUndo : function() { log.push('u2'); },
	              onRedo : function() { log.push('r2'); } });
	sv.addEntry({ label : 'anonymous 3',
	              onUndo : function() { log.push('u3'); },
	              onRedo : function() { log.push('r3'); } });

	function assertHistory(aIndex, aCount)
	{
		var history = sv.getHistory();
		assert.equals(aCount, history.entries.length, utils.inspect(history.entries));
		assert.equals(aIndex, history.index);
	}

	assertHistory(2, 3);
	sv.undo(); // u3
	assertHistory(1, 3);
	sv.redo(); // r3
	assertHistory(2, 3);
	sv.undo(); // u3
	assertHistory(1, 3);
	sv.undo(); // u2
	assertHistory(0, 3);
	sv.undo(); // u1
	assertHistory(0, 3);
	sv.redo(); // r1
	assertHistory(0, 3);
	sv.redo(); // r2
	assertHistory(1, 3);
	sv.redo(); // r3
	assertHistory(2, 3);
	sv.redo(); // --
	assertHistory(2, 3);
	sv.redo(); // --
	assertHistory(2, 3);
	sv.undo(); // u3
	assertHistory(1, 3);
	sv.undo(); // u2
	assertHistory(0, 3);
	sv.undo(); // u1
	assertHistory(0, 3);
	sv.undo(); // --
	assertHistory(0, 3);
	sv.undo(); // --
	assertHistory(0, 3);
	sv.undo(); // --
	assertHistory(0, 3);
	sv.redo(); // r1
	assertHistory(0, 3);
	sv.redo(); // r2
	assertHistory(1, 3);

	sv.addEntry({ label : 'anonymous 4',
	              onUndo : function() { log.push('u4'); },
	              onRedo : function() { log.push('r4'); } });
	assertHistory(2, 3);
	sv.undo(); // u4
	assertHistory(1, 3);
	sv.redo(); // r4
	assertHistory(2, 3);
	sv.undo(); // u4
	assertHistory(1, 3);
	sv.undo(); // u2
	assertHistory(0, 3);
	sv.undo(); // u1
	assertHistory(0, 3);
	sv.redo(); // r1
	assertHistory(0, 3);
	sv.redo(); // r2
	assertHistory(1, 3);
	sv.redo(); // r4
	assertHistory(2, 3);

	assert.equals('u3,r3,u3,u2,u1,r1,r2,r3,u3,u2,u1,r1,r2,u4,r4,u4,u2,u1,r1,r2,r4', log.join(','));
}

