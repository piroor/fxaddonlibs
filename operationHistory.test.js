utils.include('operationHistory.js', 'Shift_JIS');

var sv;
var win;
var log;

var windowSetUp = function() {
	yield Do(utils.setUpTestWindow());
	win = utils.getTestWindow();
};
var windowTearDown = function() {
	yield Do(utils.tearDownTestWindow());
	win = null;
};

function handleEvent(aEvent) {
	log.push(aEvent.type+' '+aEvent.entry.name);
}

function toSimpleList(aString) {
	return String(aString)
			.replace(/^\s+|\s+$/g, '')
			.replace(/\n\t+/g, '\n');
}

function setUp()
{
	sv = window['piro.sakura.ne.jp'].operationHistory;
	sv._db = {
		histories : {},
		observerRegistered : true
	};

	log = [];

	window.addEventListener('UIOperationHistoryUndo:global', handleEvent, false);
	window.addEventListener('UIOperationHistoryRedo:global', handleEvent, false);
}

function tearDown()
{
	window.removeEventListener('UIOperationHistoryUndo:global', handleEvent, false);
	window.removeEventListener('UIOperationHistoryRedo:global', handleEvent, false);
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
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	sv.addEntry({ name   : 'anonymous-1',
	              label  : 'anonymous 1',
	              onUndo : function() {
	                log.push('u1');
	                assert.isTrue(sv.isUndoing());
	                assert.isFalse(sv.isRedoing());
	              },
	              onRedo : function() {
	                log.push('r1');
	                assert.isFalse(sv.isUndoing());
	                assert.isTrue(sv.isRedoing());
	              } });
	sv.addEntry({ name   : 'anonymous-2',
	              label  : 'anonymous 2',
	              onUndo : function() {
	                log.push('u2');
	                assert.isTrue(sv.isUndoing());
	                assert.isFalse(sv.isRedoing());
	              },
	              onRedo : function() {
	                log.push('r2');
	                assert.isFalse(sv.isUndoing());
	                assert.isTrue(sv.isRedoing());
	              } });

	assertHistoryCount(1, 2);
	assert.isTrue(sv.undo().done); // u2
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());
	assertHistoryCount(0, 2);
	assert.isTrue(sv.redo().done); // r2
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	assert.equals(
		toSimpleList(<![CDATA[
			u2
			UIOperationHistoryUndo:global anonymous-2
			r2
			UIOperationHistoryRedo:global anonymous-2
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_complex()
{
	sv.addEntry({ name   : 'anonymous-1',
	              label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); sv.undo(); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({ name   : 'anonymous-2',
	              label  : 'anonymous 2',
	              onUndo : function() { log.push('u2'); },
	              onRedo : function() { log.push('r2'); sv.redo(); } });
	sv.addEntry({ name   : 'anonymous-3',
	              label  : 'anonymous 3',
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

	sv.addEntry({ name   : 'anonymous-4',
	              label  : 'anonymous 4',
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

	assert.equals(
		toSimpleList(<![CDATA[
			u3
			UIOperationHistoryUndo:global anonymous-3
			r3
			UIOperationHistoryRedo:global anonymous-3
			u3
			UIOperationHistoryUndo:global anonymous-3
			u2
			UIOperationHistoryUndo:global anonymous-2
			u1
			UIOperationHistoryUndo:global anonymous-1
			r1
			UIOperationHistoryRedo:global anonymous-1
			r2
			UIOperationHistoryRedo:global anonymous-2
			r3
			UIOperationHistoryRedo:global anonymous-3
			u3
			UIOperationHistoryUndo:global anonymous-3
			u2
			UIOperationHistoryUndo:global anonymous-2
			u1
			UIOperationHistoryUndo:global anonymous-1
			r1
			UIOperationHistoryRedo:global anonymous-1
			r2
			UIOperationHistoryRedo:global anonymous-2
			u4
			UIOperationHistoryUndo:global anonymous-4
			r4
			UIOperationHistoryRedo:global anonymous-4
			u4
			UIOperationHistoryUndo:global anonymous-4
			u2
			UIOperationHistoryUndo:global anonymous-2
			u1
			UIOperationHistoryUndo:global anonymous-1
			r1
			UIOperationHistoryRedo:global anonymous-1
			r2
			UIOperationHistoryRedo:global anonymous-2
			r4
			UIOperationHistoryRedo:global anonymous-4
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_skip()
{
	sv.addEntry({ name   : 'anonymous-1',
	              label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); },
	              onRedo : function() { log.push('r1'); return false; } });
	sv.addEntry({ name   : 'anonymous-2',
	              label  : 'anonymous 2',
	              onUndo : function() { log.push('u2'); return false; },
	              onRedo : function() { log.push('r2'); } });

	assertHistoryCount(1, 2);
	sv.undo(); // u2, u1
	assertHistoryCount(0, 2);
	sv.redo(); // r1, r2
	assertHistoryCount(1, 2);

	assert.equals(
		toSimpleList(<![CDATA[
			u2
			UIOperationHistoryUndo:global anonymous-2
			u1
			UIOperationHistoryUndo:global anonymous-1
			r1
			UIOperationHistoryRedo:global anonymous-1
			r2
			UIOperationHistoryRedo:global anonymous-2
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_continuation()
{
	sv.addEntry({ name   : 'anonymous-1',
	              label  : 'anonymous 1',
	              onUndo : function() { log.push('u1'); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({
	              name   : 'anonymous-2',
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

	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	info = sv.undo(); // u2
	assertHistoryCount(0, 2);
	assert.isFalse(info.done);
	assert.isTrue(sv.isUndoing(), uneval(info));
	assert.isFalse(sv.isRedoing());
	yield 600;
	assert.isTrue(info.done);
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	info = sv.redo(); // r2
	assertHistoryCount(1, 2);
	assert.isFalse(info.done);
	assert.isFalse(sv.isUndoing());
	assert.isTrue(sv.isRedoing());
	yield 600;
	assert.isTrue(info.done);
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	assert.equals(
		toSimpleList(<![CDATA[
			u2
			UIOperationHistoryUndo:global anonymous-2
			r2
			UIOperationHistoryRedo:global anonymous-2
		]]>),
		log.join('\n')
	);
}

function test_doOperation()
{
	var info = sv.doOperation(
		function() {
			log.push('op0');
			sv.doOperation(
				function() {
					log.push('op1');
					sv.doOperation(
						function() {
							log.push('op2');
						},
						{ name   : 'entry-2',
						  label  : 'entry 2',
						  onUndo : function(aInfo) {
						    log.push('lv'+aInfo.level);
						    log.push('u2');
						  },
						  onRedo : function(aInfo) {
						    log.push('lv'+aInfo.level);
						    log.push('r2');
						  } }
					);
					// If the operation returns false,
					// it should not be registered to the history.
					sv.doOperation(
						function() {
							log.push('op3');
							return false;
						},
						{ name   : 'entry-3',
						  label  : 'entry 3',
						  onUndo : function(aInfo) {
						    log.push('lv'+aInfo.level);
						    log.push('u3');
						  },
						  onRedo : function(aInfo) {
						    log.push('lv'+aInfo.level);
						    log.push('r3');
						  } }
					);
				},
				{ name   : 'entry-1',
				  label  : 'entry 1',
				  onUndo : function(aInfo) {
				    log.push('lv'+aInfo.level);
				    return false;
				    log.push('u1');
				  },
				  onRedo : function(aInfo) {
				    log.push('lv'+aInfo.level);
				    return false;
				    log.push('r1');
				  } }
			);
		},
		{ name   : 'entry-0',
		  label  : 'entry 0',
		  onUndo : function(aInfo) {
		    log.push('lv'+aInfo.level);
		    log.push('u0');
		  },
		  onRedo : function(aInfo) {
		    log.push('lv'+aInfo.level);
		    log.push('r0');
		  } }
	);
	assert.isTrue(info.done);

	var history = sv.getHistory();
	assert.equals(1, history.entries.length, utils.inspect(history.entries));
	assert.equals('entry 0', history.entries[0].label);

	sv.undo();
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			op0
			op1
			op2
			op3
			lv2
			u2
			UIOperationHistoryUndo:global entry-2
			lv1
			UIOperationHistoryUndo:global entry-1
			lv0
			u0
			UIOperationHistoryUndo:global entry-0
			lv0
			r0
			UIOperationHistoryRedo:global entry-0
			lv1
			UIOperationHistoryRedo:global entry-1
			lv2
			r2
			UIOperationHistoryRedo:global entry-2
		]]>),
		log.join('\n')
	);
}

function test_doOperation_continuation()
{
	var info;

	var history = sv.getHistory();
	info = sv.doOperation(
		function(aInfo) {
			log.push('op00');
			var continuation = aInfo.getContinuation();
			var info = sv.doOperation(
				function(aInfo) {
					log.push('op01');
					var info = sv.doOperation(
						function(aInfo) {
							log.push('op02');
						},
						{ name   : 'entry-02',
						  label  : 'entry 02',
						  onUndo : function(aInfo) { log.push('u02'); },
						  onRedo : function(aInfo) { log.push('r02'); } }
					);
					assert.isTrue(info.done);
				},
				{ name   : 'entry-01',
				  label  : 'entry 01',
				  onUndo : function(aInfo) { log.push('u01'); },
				  onRedo : function(aInfo) { log.push('r01'); } }
			);
			window.setTimeout(function() {
			  continuation();
			}, 300);
			assert.isTrue(info.done);
		},
		{ name   : 'entry-00',
		  label  : 'entry 00',
		  onUndo : function(aInfo) { log.push('u00'); },
		  onRedo : function(aInfo) { log.push('r00'); } }
	);
	assert.isFalse(info.done);
	yield 600;
	assert.isTrue(info.done);

	info = sv.doOperation(
		function(aInfo) {
			log.push('op10');
			var info = sv.doOperation(
				function(aInfo) {
					log.push('op11');
					var continuation = aInfo.getContinuation();
					var info = sv.doOperation(
						function(aInfo) {
							log.push('op12');
						},
						{ name   : 'entry-12',
						  label  : 'entry 12',
						  onUndo : function(aInfo) { log.push('u12'); },
						  onRedo : function(aInfo) { log.push('r12'); } }
					);
					assert.isTrue(info.done);
					window.setTimeout(function() {
					  continuation();
					}, 300);
				},
				{ name   : 'entry-11',
				  label  : 'entry 11',
				  onUndo : function(aInfo) { log.push('u11'); },
				  onRedo : function(aInfo) { log.push('r11'); } }
			);
			assert.isFalse(info.done);
		},
		{ name   : 'entry-10',
		  label  : 'entry 10',
		  onUndo : function(aInfo) { log.push('u10'); },
		  onRedo : function(aInfo) { log.push('r10'); } }
	);
	assert.isTrue(info.done);

	sv.undo();
	sv.undo();
	sv.redo();
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			op00
			op01
			op02
			op10
			op11
			op12
			u12
			UIOperationHistoryUndo:global entry-12
			u11
			UIOperationHistoryUndo:global entry-11
			u10
			UIOperationHistoryUndo:global entry-10
			u02
			UIOperationHistoryUndo:global entry-02
			u01
			UIOperationHistoryUndo:global entry-01
			u00
			UIOperationHistoryUndo:global entry-00
			r00
			UIOperationHistoryRedo:global entry-00
			r01
			UIOperationHistoryRedo:global entry-01
			r02
			UIOperationHistoryRedo:global entry-02
			r10
			UIOperationHistoryRedo:global entry-10
			r11
			UIOperationHistoryRedo:global entry-11
			r12
			UIOperationHistoryRedo:global entry-12
		]]>),
		log.join('\n')
	);
}

function test_exceptions()
{
	assert.raises('EXCEPTION FROM UNDOABLE OPERATION', function() {
		sv.doOperation(
			function() {
				log.push('op0');
				sv.doOperation(
					function() {
						log.push('op1');
						throw 'EXCEPTION FROM UNDOABLE OPERATION';
					},
					{ name   : 'entry-1',
					  label  : 'entry 1',
					  onUndo : function(aInfo) {
					    log.push('u1');
					  },
					  onRedo : function(aInfo) {
					    throw 'EXCEPTION FROM REDO PROCESS';
					    log.push('r1');
					  } }
				);
			},
			{ name   : 'entry-0',
			  label  : 'entry 0',
			  onUndo : function(aInfo) {
			    throw 'EXCEPTION FROM UNDO PROCESS';
			    log.push('u0');
			  },
			  onRedo : function(aInfo) {
			    log.push('r0');
			  } }
		);
	});

	assert.raises('EXCEPTION FROM UNDO PROCESS', function() {
		sv.undo();
	});
	assert.raises('EXCEPTION FROM REDO PROCESS', function() {
		sv.redo();
	});

	assert.equals(
		toSimpleList(<![CDATA[
			op0
			op1
			u1
			UIOperationHistoryUndo:global entry-1
			r0
			UIOperationHistoryRedo:global entry-0
		]]>),
		log.join('\n')
	);
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

function test_UIHistory_namedEntry()
{
	var history = new sv.UIHistory('test', null, null);
	history.addEntry({ name : '0' });
	history.inOperation = true;
	history.addEntry({ name : '1' });
	history.addEntry({ name : '2' });
	history.addEntry({ name : '3' });
	history.inOperation = false;
	assert.equals('0,1,2,3', history.metaData[history.safeIndex].names.join(','));
}


function test_UIHistoryProxy_index()
{
	var history = new sv.UIHistory('test', null, null);
	history.addEntry('0');
	history.addEntry('1');
	history.addEntry('2');
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

