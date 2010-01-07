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
	sv._db = {};
}

function tearDown()
{
}

test_getWindowId.setUp = windowSetUp;
test_getWindowId.tearDown = windowTearDown;
function test_getWindowId()
{
	var id = sv.getWindowId(win);
	assert.isNotNull(id);
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

function assertHistoryCount(aIndex, aCount)
{
	var history = sv.getHistory();
	assert.equals(aCount, history.entries.length, utils.inspect(history.entries));
	assert.equals(aIndex, history.index);
}

function test_undoRedo_simple()
{
	var log = [];

	sv.addEntry({ label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({ label : 'anonymous 2',
	              onUndo : function() { log.push('u2'); },
	              onRedo : function() { log.push('r2'); } });

	assertHistoryCount(1, 2);
	assert.isTrue(sv.undo().done); // u2
	assertHistoryCount(0, 2);
	assert.isTrue(sv.redo().done); // r2

	assert.equals('u2,r2', log.join(','));
}

function test_undoRedo_complex()
{
	var log = [];

	sv.addEntry({ label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); sv.undo(); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({ label : 'anonymous 2',
	              onUndo : function() { log.push('u2'); },
	              onRedo : function() { log.push('r2'); sv.redo(); } });
	sv.addEntry({ label : 'anonymous 3',
	              onUndo : function() { log.push('u3'); sv.undo(); },
	              onRedo : function() { log.push('r3'); sv.redo(); } });

	assertHistoryCount(2, 3);
	sv.undo(); // u3
	assertHistoryCount(1, 3);
	sv.redo(); // r3
	assertHistoryCount(2, 3);
	sv.undo(); // u3
	assertHistoryCount(1, 3);
	sv.undo(); // u2
	assertHistoryCount(0, 3);
	sv.undo(); // u1
	assertHistoryCount(0, 3);
	sv.redo(); // r1
	assertHistoryCount(0, 3);
	sv.redo(); // r2
	assertHistoryCount(1, 3);
	sv.redo(); // r3
	assertHistoryCount(2, 3);
	sv.redo(); // --
	assertHistoryCount(2, 3);
	sv.redo(); // --
	assertHistoryCount(2, 3);
	sv.undo(); // u3
	assertHistoryCount(1, 3);
	sv.undo(); // u2
	assertHistoryCount(0, 3);
	sv.undo(); // u1
	assertHistoryCount(0, 3);
	sv.undo(); // --
	assertHistoryCount(0, 3);
	sv.undo(); // --
	assertHistoryCount(0, 3);
	sv.undo(); // --
	assertHistoryCount(0, 3);
	sv.redo(); // r1
	assertHistoryCount(0, 3);
	sv.redo(); // r2
	assertHistoryCount(1, 3);

	sv.addEntry({ label : 'anonymous 4',
	              onUndo : function() { log.push('u4'); sv.addEntry({ label: 'invalid/undo' }); },
	              onRedo : function() { log.push('r4'); sv.addEntry({ label: 'invalid/redo' }); } });
	assertHistoryCount(2, 3);
	sv.undo(); // u4
	assertHistoryCount(1, 3);
	sv.redo(); // r4
	assertHistoryCount(2, 3);
	sv.undo(); // u4
	assertHistoryCount(1, 3);
	sv.undo(); // u2
	assertHistoryCount(0, 3);
	sv.undo(); // u1
	assertHistoryCount(0, 3);
	sv.redo(); // r1
	assertHistoryCount(0, 3);
	sv.redo(); // r2
	assertHistoryCount(1, 3);
	sv.redo(); // r4
	assertHistoryCount(2, 3);

	assert.equals('u3,r3,u3,u2,u1,r1,r2,r3,u3,u2,u1,r1,r2,u4,r4,u4,u2,u1,r1,r2,r4', log.join(','));
}

function test_undoRedo_skip()
{
	var log = [];

	sv.addEntry({ label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); },
	              onRedo : function() { log.push('r1'); return false; } });
	sv.addEntry({ label : 'anonymous 2',
	              onUndo : function() { log.push('u2'); return false; },
	              onRedo : function() { log.push('r2'); } });

	assertHistoryCount(1, 2);
	sv.undo(); // u2, u1
	assertHistoryCount(0, 2);
	sv.redo(); // r1, r2
	assertHistoryCount(1, 2);

	assert.equals('u2,u1,r1,r2', log.join(','));
}

function test_undoRedo_continuation()
{
	var log = [];

	sv.addEntry({ label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({
	              label  : 'anonymous 2',
	              onUndo : function(aInfo) {
	                log.push('u2');
	                var continuation = aInfo.getContinuation();
	                window.setTimeout(function() {
	                  continuation();
	                }, 300);
	              },
	              onRedo : function(aInfo) {
	                log.push('r2');
	                var continuation = aInfo.getContinuation();
	                window.setTimeout(function() {
	                  continuation();
	                }, 300);
	              }
	            });

	assertHistoryCount(1, 2);

	var info;

	info = sv.undo(); // u2
	assertHistoryCount(0, 2);
	assert.isFalse(info.done);
	yield 600;
	assert.isTrue(info.done);

	info = sv.redo(); // r2
	assertHistoryCount(1, 2);
	assert.isFalse(info.done);
	yield 600;
	assert.isTrue(info.done);

	assert.equals('u2,r2', log.join(','));
}

function test_doUndoableTask()
{
	var log = [];
	var info = sv.doUndoableTask(
		function() {
			sv.doUndoableTask(
				function() {
					sv.doUndoableTask(
						function() {
						},
						{ label  : 'entry 2',
						  onUndo : function(aInfo) {
						    log.push(aInfo.level);
						    log.push('u2');
						  },
						  onRedo : function(aInfo) {
						    log.push(aInfo.level);
						    log.push('r2');
						  } }
					);
				},
				{ label  : 'entry 1',
				  onUndo : function(aInfo) {
				    log.push(aInfo.level);
				    if (aInfo.level) return false;
				    log.push('u1');
				  },
				  onRedo : function(aInfo) {
				    log.push(aInfo.level);
				    if (aInfo.level) return false;
				    log.push('r1');
				  } }
			);
		},
		{ label  : 'entry 0',
		  onUndo : function(aInfo) {
		    log.push(aInfo.level);
		    log.push('u0');
		  },
		  onRedo : function(aInfo) {
		    log.push(aInfo.level);
		    log.push('r0');
		  } }
	);
	assert.isTrue(info.done);

	var history = sv.getHistory();
	assert.equals(1, history.entries.length, utils.inspect(history.entries));
	assert.equals('entry 0', history.entries[0].label);

	sv.undo();
	sv.redo();
	assert.equals('0,u0,1,2,u2,0,r0,1,2,r2', log.join(','));
}

function test_doUndoableTask_autoRegisterRedo()
{
	var task = function() { var foo = 'bar'; };
	sv.doUndoableTask(
		task,
		{ label  : 'entry 1',
		  onUndo : function() { return true; } }
	);

	var history = sv.getHistory();
	assert.equals(task, history.entries[0].onRedo);
}

function test_doUndoableTask_continuation()
{
	var log = [];
	var info;

	var history = sv.getHistory();
	info = sv.doUndoableTask(
		function(aInfo) {
			var continuation = aInfo.getContinuation();
			var info = sv.doUndoableTask(
				function(aInfo) {
					var info = sv.doUndoableTask(
						function(aInfo) {
						},
						{ label  : 'entry 02',
						  onUndo : function(aInfo) { log.push('u02'); },
						  onRedo : function(aInfo) { log.push('r02'); } }
					);
					assert.isFalse(info.done);
				},
				{ label  : 'entry 01',
				  onUndo : function(aInfo) { log.push('u01'); },
				  onRedo : function(aInfo) { log.push('r01'); } }
			);
			window.setTimeout(function() {
			  continuation();
			}, 300);
			assert.isFalse(info.done);
		},
		{ label  : 'entry 00',
		  onUndo : function(aInfo) { log.push('u00'); },
		  onRedo : function(aInfo) { log.push('r00'); } }
	);
	assert.isFalse(info.done);
	yield 600;
	assert.isTrue(info.done);

	info = sv.doUndoableTask(
		function(aInfo) {
			var info = sv.doUndoableTask(
				function(aInfo) {
					var continuation = aInfo.getContinuation();
					var info = sv.doUndoableTask(
						function(aInfo) {
						},
						{ label  : 'entry 12',
						  onUndo : function(aInfo) { log.push('u12'); },
						  onRedo : function(aInfo) { log.push('r12'); } }
					);
					assert.isFalse(info.done);
					window.setTimeout(function() {
					  continuation();
					}, 300);
				},
				{ label  : 'entry 11',
				  onUndo : function(aInfo) { log.push('u11'); },
				  onRedo : function(aInfo) { log.push('r11'); } }
			);
			assert.isFalse(info.done);
		},
		{ label  : 'entry 10',
		  onUndo : function(aInfo) { log.push('u10'); },
		  onRedo : function(aInfo) { log.push('r10'); } }
	);
	assert.isFalse(info.done);
	yield 600;
	assert.isTrue(info.done);

	sv.undo();
	sv.undo();
	sv.redo();
	sv.redo();
	assert.equals('u10,u11,u12,u00,u01,u02,r00,r01,r02,r10,r11,r12', log.join(','));
}



/* tests for internal classes */

function test_UIHistory_init()
{
	var history = new sv.UIHistory('test', null, null);
	assert.equals([], history.entries);
	assert.equals([], history.metaData);
	assert.equals(-1, history.index);
	assert.isFalse(history.inOperation);
}

var testMaxPrefKeyGlobal = 'extensions.UIOperationsHistoryManager@piro.sakura.ne.jp.test.max.global';
var testMaxPrefKeyWindow = 'extensions.UIOperationsHistoryManager@piro.sakura.ne.jp.test.max.window';
test_UIHistory_max_global.setUp = test_UIHistory_max_window.setUp = function() {
	utils.clearPref(testMaxPrefKeyGlobal);
	utils.clearPref(testMaxPrefKeyWindow);
	assert.isNull(utils.getPref(testMaxPrefKeyGlobal));
	assert.isNull(utils.getPref(testMaxPrefKeyWindow));
};
test_UIHistory_max_global.tearDown = test_UIHistory_max_window.tearDown = function() {
	utils.clearPref(testMaxPrefKeyGlobal);
	utils.clearPref(testMaxPrefKeyWindow);
};
function test_UIHistory_max_global()
{
	var maxDefault = sv.UIHistory.prototype.MAX_ENTRIES;
	var history;

	history = new sv.UIHistory('test', null, null);
	assert.equals(maxDefault, history.max);
	assert.equals(testMaxPrefKeyGlobal, history.maxPref);
	history.max = 10;
	assert.equals(10, history.max);
	assert.equals(10, utils.getPref(testMaxPrefKeyGlobal));
	assert.isNull(utils.getPref(testMaxPrefKeyWindow));

	history = new sv.UIHistory('test', null, null);
	assert.equals(10, history.max);

	history = new sv.UIHistory('test', window, 'test');
	assert.equals(maxDefault, history.max);
}
function test_UIHistory_max_window()
{
	var maxDefault = sv.UIHistory.prototype.MAX_ENTRIES;
	var history

	history = new sv.UIHistory('test', window, 'test');
	assert.equals(maxDefault, history.max);
	assert.equals(testMaxPrefKeyWindow, history.maxPref);
	history.max = 10;
	assert.equals(10, history.max);
	assert.isNull(utils.getPref(testMaxPrefKeyGlobal));
	assert.equals(10, utils.getPref(testMaxPrefKeyWindow));

	history = new sv.UIHistory('test', null, null);
	assert.equals(maxDefault, history.max);

	history = new sv.UIHistory('test', window, 'test');
	assert.equals(10, history.max);
}

function test_UIHistory_addEntry()
{
	var history = new sv.UIHistory('test', null, null);
	assert.equals([], history.entries);
	assert.equals([], history.metaData);
	assert.equals(-1, history.index);
	assert.isFalse(history.inOperation);

	history.addEntry(0);
	history.addEntry(1);
	history.addEntry(2);
	assert.equals([0, 1, 2], history.entries);
	assert.equals(3, history.metaData.length);
	assert.equals([], history.metaData[0].children);
	assert.equals([], history.metaData[1].children);
	assert.equals([], history.metaData[2].children);
	assert.equals(3, history.index);

	history.inOperation = true;

	history.addEntry(3);
	history.addEntry(4);
	history.addEntry(5);
	assert.equals([0, 1, 2], history.entries);
	assert.equals(3, history.metaData.length);
	assert.equals([], history.metaData[0].children);
	assert.equals([], history.metaData[1].children);
	assert.equals([3, 4, 5], history.metaData[2].children);
	assert.equals(3, history.index);

	history.inOperation = false;

	history.addEntry(6);
	assert.equals([0, 1, 2, 6], history.entries);
	assert.equals(4, history.metaData.length);
	assert.equals(4, history.index);
}

function test_UIHistory_canUndoRedo()
{
	var history = new sv.UIHistory('test', null, null);

	history.addEntry(0);
	history.addEntry(1);
	history.addEntry(2);
	assert.isTrue(history.canUndo);
	assert.isFalse(history.canRedo);
	history.index = 4;
	assert.isTrue(history.canUndo);
	assert.isFalse(history.canRedo);
	history.index = 10;
	assert.isTrue(history.canUndo);
	assert.isFalse(history.canRedo);

	history.index = 0;
	assert.isTrue(history.canUndo);
	assert.isTrue(history.canRedo);
	history.index = -1;
	assert.isFalse(history.canUndo);
	assert.isTrue(history.canRedo);
	history.index = -10;
	assert.isFalse(history.canUndo);
	assert.isTrue(history.canRedo);

	history.index = 1;
	assert.isTrue(history.canUndo);
	assert.isTrue(history.canRedo);
}

function test_UIHistory_currentLastEntry()
{
	var history = new sv.UIHistory('test', null, null);

	history.addEntry('0');
	history.addEntry('1');
	history.addEntry('2');
	assert.isNull(history.currentEntry);
	assert.equals('2', history.lastEntry);
	history.index = 2;
	assert.equals('2', history.currentEntry);
	assert.equals('2', history.lastEntry);
	history.index = 4;
	assert.isNull(history.currentEntry);
	assert.equals('2', history.lastEntry);
	history.index = 10;
	assert.isNull(history.currentEntry);
	assert.equals('2', history.lastEntry);

	history.index = 0;
	assert.equals('0', history.currentEntry);
	assert.equals('2', history.lastEntry);
	history.index = -1;
	assert.isNull(history.currentEntry);
	assert.equals('2', history.lastEntry);
	history.index = -10;
	assert.isNull(history.currentEntry);
	assert.equals('2', history.lastEntry);

	history.index = 1;
	assert.equals('1', history.currentEntry);
	assert.equals('2', history.lastEntry);
}

function test_UIHistory_currentLastMetaData()
{
	var history = new sv.UIHistory('test', null, null);

	history.addEntry('0');
	history.addEntry('1');
	history.addEntry('2');
	var metaData = history.metaData;
	assert.isNull(history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);
	history.index = 2;
	assert.strictlyEquals(metaData[2], history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);
	history.index = 4;
	assert.isNull(history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);
	history.index = 10;
	assert.isNull(history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);

	history.index = 0;
	assert.strictlyEquals(metaData[0], history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);
	history.index = -1;
	assert.isNull(history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);
	history.index = -10;
	assert.isNull(history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);

	history.index = 1;
	assert.strictlyEquals(metaData[1], history.currentMetaData);
	assert.strictlyEquals(metaData[2], history.lastMetaData);
}

function test_UIHistory_currentLastEntries()
{
	var history = new sv.UIHistory('test', null, null);

	history.addEntry('0');
	history.inOperation = true;
	history.addEntry('0.1');
	history.addEntry('0.2');
	history.inOperation = false;
	history.addEntry('1');
	history.inOperation = true;
	history.addEntry('1.1');
	history.addEntry('1.2');
	history.inOperation = false;
	history.addEntry('2');
	history.inOperation = true;
	history.addEntry('2.1');
	history.addEntry('2.2');
	history.inOperation = false;

	assert.equals([], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);
	history.index = 2;
	assert.equals(['2', '2.1', '2.2'], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);
	history.index = 4;
	assert.equals([], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);
	history.index = 10;
	assert.equals([], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);

	history.index = 0;
	assert.equals(['0', '0.1', '0.2'], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);
	history.index = -1;
	assert.equals([], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);
	history.index = -10;
	assert.equals([], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);

	history.index = 1;
	assert.equals(['1', '1.1', '1.2'], history.currentEntries);
	assert.equals(['2', '2.1', '2.2'], history.lastEntries);
}


function test_UIHistoryProxy_index()
{
	var history = {
			entries : [0, 1, 2],
			index   : 0
		};
	var proxy = new sv.UIHistoryProxy(history);

	history.index = 0;
	assert.equals(0, proxy.index);
	history.index = -1;
	assert.equals(0, proxy.index);
	history.index = -10;
	assert.equals(0, proxy.index);
	history.index = 2;
	assert.equals(2, proxy.index);
	history.index = 3;
	assert.equals(2, proxy.index);
	history.index = 10;
	assert.equals(2, proxy.index);
}


function test_UIHistoryMetaData_children()
{
	var metaData = new sv.UIHistoryMetaData();

	assert.equals([], metaData.children);
}


function test_ContinuationInfo_done()
{
	var info;

	info = new sv.ContinuationInfo();
	assert.isTrue(info.done);
	assert.isFalse(info.shouldWait);
	info.created = true;
	assert.isFalse(info.done);
	assert.isTrue(info.shouldWait);
	info.called = true;
	assert.isTrue(info.done);
	assert.isFalse(info.shouldWait);

	info = new sv.ContinuationInfo();
	info.done = false;
	assert.isFalse(info.done);
	assert.isFalse(info.shouldWait);
	info.created = true;
	assert.isFalse(info.done);
	assert.isTrue(info.shouldWait);
	info.called = true;
	assert.isFalse(info.done);
	assert.isFalse(info.shouldWait);
	info.done = true;
	assert.isTrue(info.done);
	assert.isFalse(info.shouldWait);
}
