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
	assert.equals(
		aIndex+' / '+aCount,
		history.index+' / '+history.entries.length,
		utils.inspect(history.entries)
	);
}

function test_undoRedo_simple()
{
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	sv.addEntry({ name   : 'entry 1',
	              label  : 'entry  1',
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
	sv.addEntry({ name   : 'entry 2',
	              label  : 'entry  2',
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
			UIOperationHistoryUndo:global entry 2
			r2
			UIOperationHistoryRedo:global entry 2
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_complex()
{
	sv.addEntry({ name   : 'entry 1',
	              label  : 'entry  1',
	              onUndo : function() { log.push('u1'); sv.undo(); },
	              onRedo : function() { log.push('r1'); } });
	sv.addEntry({ name   : 'entry 2',
	              label  : 'entry  2',
	              onUndo : function() { log.push('u2'); },
	              onRedo : function() { log.push('r2'); sv.redo(); } });
	sv.addEntry({ name   : 'entry 3',
	              label  : 'entry  3',
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

	sv.addEntry({ name   : 'entry 4',
	              label  : 'entry  4',
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
			UIOperationHistoryUndo:global entry 3
			r3
			UIOperationHistoryRedo:global entry 3
			u3
			UIOperationHistoryUndo:global entry 3
			u2
			UIOperationHistoryUndo:global entry 2
			u1
			UIOperationHistoryUndo:global entry 1
			r1
			UIOperationHistoryRedo:global entry 1
			r2
			UIOperationHistoryRedo:global entry 2
			r3
			UIOperationHistoryRedo:global entry 3
			u3
			UIOperationHistoryUndo:global entry 3
			u2
			UIOperationHistoryUndo:global entry 2
			u1
			UIOperationHistoryUndo:global entry 1
			r1
			UIOperationHistoryRedo:global entry 1
			r2
			UIOperationHistoryRedo:global entry 2
			u4
			UIOperationHistoryUndo:global entry 4
			r4
			UIOperationHistoryRedo:global entry 4
			u4
			UIOperationHistoryUndo:global entry 4
			u2
			UIOperationHistoryUndo:global entry 2
			u1
			UIOperationHistoryUndo:global entry 1
			r1
			UIOperationHistoryRedo:global entry 1
			r2
			UIOperationHistoryRedo:global entry 2
			r4
			UIOperationHistoryRedo:global entry 4
		]]>),
		log.join('\n')
	);
}

function handlEvent_skip(aEvent) {
	if (aEvent.entry.name == 'skip both')
		aEvent.skip();
}
test_undoRedo_skip.setUp = function() {
	window.addEventListener('UIOperationHistoryUndo:global', handlEvent_skip, false);
	window.addEventListener('UIOperationHistoryRedo:global', handlEvent_skip, false);
}
test_undoRedo_skip.tearDown = function() {
	window.removeEventListener('UIOperationHistoryUndo:global', handlEvent_skip, false);
	window.removeEventListener('UIOperationHistoryRedo:global', handlEvent_skip, false);
}
function test_undoRedo_skip()
{
	sv.addEntry({ name   : 'skip redo',
	              label  : 'skip redo',
	              onUndo : function() { log.push('u redo'); },
	              onRedo : function(aInfo) { log.push('r redo'); aInfo.skip(); } });
	sv.addEntry({ name   : 'skip undo',
	              label  : 'skip undo',
	              onUndo : function(aInfo) { log.push('u undo'); aInfo.skip(); },
	              onRedo : function() { log.push('r undo'); } });
	sv.addEntry({ name   : 'skip both',
	              label  : 'skip both',
	              onUndo : function() { log.push('u both'); },
	              onRedo : function() { log.push('r both'); } });
	sv.addEntry({ name   : 'normal',
	              label  : 'normal',
	              onUndo : function() { log.push('u normal'); },
	              onRedo : function() { log.push('r normal'); } });

	assertHistoryCount(3, 4);
	sv.undo(); // u normal
	assertHistoryCount(2, 4);
	sv.undo(); // u both, u undo, u redo
	assertHistoryCount(0, 4);
	sv.redo(); // r redo, r undo
	assertHistoryCount(1, 4);
	sv.redo(); // r both, r normal
	assertHistoryCount(3, 4);

	assert.equals(
		toSimpleList(<![CDATA[
			u normal
			UIOperationHistoryUndo:global normal
			u both
			UIOperationHistoryUndo:global skip both
			u undo
			UIOperationHistoryUndo:global skip undo
			u redo
			UIOperationHistoryUndo:global skip redo
			r redo
			UIOperationHistoryRedo:global skip redo
			r undo
			UIOperationHistoryRedo:global skip undo
			r both
			UIOperationHistoryRedo:global skip both
			r normal
			UIOperationHistoryRedo:global normal
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_wait()
{
	sv.addEntry({ name   : 'normal',
	              label  : 'normal',
	              onUndo : function() { log.push('u normal'); },
	              onRedo : function() { log.push('r normal'); } });
	sv.addEntry({
	              name   : 'delayed',
	              label  : 'delayed',
	              onUndo : function(aInfo) {
	                log.push('u delayed');
	                aInfo.wait();
	                window.setTimeout(function() {
	                  aInfo.continue();
	                }, 300);
	              },
	              onRedo : function(aInfo) {
	                log.push('r delayed');
	                aInfo.wait();
	                window.setTimeout(function() {
	                  aInfo.continue();
	                }, 300);
	              }
	            });

	assertHistoryCount(1, 2);

	var info;

	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	info = sv.undo(); // u delayed
	assertHistoryCount(0, 2);
	assert.isFalse(info.done);
	assert.isTrue(sv.isUndoing(), uneval(info));
	assert.isFalse(sv.isRedoing());
	yield 600;
	assert.isTrue(info.done);
	assert.isFalse(sv.isUndoing());
	assert.isFalse(sv.isRedoing());

	info = sv.redo(); // r delayed
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
			u delayed
			UIOperationHistoryUndo:global delayed
			r delayed
			UIOperationHistoryRedo:global delayed
		]]>),
		log.join('\n')
	);
}

function test_doOperation()
{
	var info = sv.doOperation(
		function() {
			log.push('parent operation');
			sv.doOperation(
				function() {
					log.push('child operation');
					sv.doOperation(
						function() {
							log.push('deep operation');
						},
						{ name   : 'deep',
						  label  : 'deep',
						  onUndo : function(aInfo) {
						    log.push('deep undo');
						  },
						  onRedo : function(aInfo) {
						    // this function should not be called because it is canceled.
						    log.push('deep redo');
						  } }
					);
					// If the operation returns false,
					// it should not be registered to the history.
					sv.doOperation(
						function() {
							log.push('canceled operation');
							return false;
						},
						{ name   : 'canceled',
						  label  : 'canceled',
						  onUndo : function(aInfo) {
						    log.push('canceled undo');
						  },
						  onRedo : function(aInfo) {
						    log.push('canceled redo');
						  } }
					);
				},
				{ name   : 'child',
				  label  : 'child',
				  onUndo : function(aInfo) {
				    log.push('child undo');
				    return false;
				  },
				  onRedo : function(aInfo) {
				    log.push('child redo');
				    return false;
				  } }
			);
		},
		{ name   : 'parent',
		  label  : 'parent',
		  onUndo : function(aInfo) {
		    // this function should not be called because it is canceled.
		    log.push('parent undo');
		  },
		  onRedo : function(aInfo) {
		    log.push('parent redo');
		  } }
	);
	assert.isTrue(info.done);

	var history = sv.getHistory();
	assert.equals(1, history.entries.length, utils.inspect(history.entries));
	assert.equals('parent', history.entries[0].label, utils.inspect(history.entries[0]));

	sv.undo();
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			parent operation
			child operation
			deep operation
			canceled operation
			deep undo
			UIOperationHistoryUndo:global deep
			child undo
			parent redo
			UIOperationHistoryRedo:global parent
			child redo
		]]>),
		log.join('\n')
	);
}

function handlEvent_cancel(aEvent) {
	if (aEvent.entry.name == 'child')
		aEvent.preventDefault();
}
test_doOperation_canceledByEventListener.setUp = function() {
	window.addEventListener('UIOperationHistoryUndo:global', handlEvent_cancel, false);
	window.addEventListener('UIOperationHistoryRedo:global', handlEvent_cancel, false);
}
test_doOperation_canceledByEventListener.tearDown = function() {
	window.removeEventListener('UIOperationHistoryUndo:global', handlEvent_cancel, false);
	window.removeEventListener('UIOperationHistoryRedo:global', handlEvent_cancel, false);
}
function test_doOperation_canceledByEventListener()
{
	var info = sv.doOperation(
		function() {
			log.push('parent operation');
			sv.doOperation(
				function() {
					log.push('child operation');
					sv.doOperation(
						function() {
							log.push('deep operation');
						},
						{ name   : 'deep',
						  label  : 'deep',
						  onUndo : function(aInfo) {
						    log.push('deep undo');
						  },
						  onRedo : function(aInfo) {
						    // this function should not be called because it is canceled.
						    log.push('deep redo');
						  } }
					);
				},
				{ name   : 'child',
				  label  : 'child',
				  onUndo : function(aInfo) {
				    log.push('child undo');
				  },
				  onRedo : function(aInfo) {
				    log.push('child redo');
				  } }
			);
		},
		{ name   : 'parent',
		  label  : 'parent',
		  onUndo : function(aInfo) {
		    // this function should not be called because it is canceled.
		    log.push('parent undo');
		  },
		  onRedo : function(aInfo) {
		    log.push('parent redo');
		  } }
	);
	assert.isTrue(info.done);

	var history = sv.getHistory();
	assert.equals(1, history.entries.length, utils.inspect(history.entries));
	assert.equals('parent', history.entries[0].label, utils.inspect(history.entries[0]));

	sv.undo();
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			parent operation
			child operation
			deep operation
			deep undo
			UIOperationHistoryUndo:global deep
			child undo
			UIOperationHistoryUndo:global child
			parent redo
			UIOperationHistoryRedo:global parent
			child redo
			UIOperationHistoryRedo:global child
		]]>),
		log.join('\n')
	);
}

function test_doOperation_wait()
{
	var info;

	var history = sv.getHistory();
	info = sv.doOperation(
		function(aInfo) {
			log.push('op delayed parent');
			aInfo.wait();
			var info = sv.doOperation(
				function(aInfo) {
					log.push('op normal child');
				},
				{ name   : 'normal child',
				  label  : 'normal child',
				  onUndo : function(aInfo) { log.push('u normal child'); },
				  onRedo : function(aInfo) { log.push('r normal child'); } }
			);
			window.setTimeout(function() {
			  aInfo.continue();
			}, 300);
			assert.isTrue(info.done);
		},
		{ name   : 'delayed parent',
		  label  : 'delayed parent',
		  onUndo : function(aInfo) { log.push('u delayed parent'); },
		  onRedo : function(aInfo) { log.push('r delayed parent'); } }
	);
	assert.isFalse(info.done);
	yield 600;
	assert.isTrue(info.done);

	info = sv.doOperation(
		function(aInfo) {
			log.push('op normal parent');
			var info = sv.doOperation(
				function(aInfo) {
					log.push('op delayed child');
					aInfo.wait();
					window.setTimeout(function() {
					  aInfo.continue();
					}, 300);
				},
				{ name   : 'delayed child',
				  label  : 'delayed child',
				  onUndo : function(aInfo) { log.push('u delayed child'); },
				  onRedo : function(aInfo) { log.push('r delayed child'); } }
			);
			assert.isFalse(info.done);
		},
		{ name   : 'normal parent',
		  label  : 'normal parent',
		  onUndo : function(aInfo) { log.push('u normal parent'); },
		  onRedo : function(aInfo) { log.push('r normal parent'); } }
	);
	assert.isTrue(info.done);

	sv.undo();
	sv.undo();
	sv.redo();
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			op delayed parent
			op normal child
			op normal parent
			op delayed child
			u delayed child
			UIOperationHistoryUndo:global delayed child
			u normal parent
			UIOperationHistoryUndo:global normal parent
			u normal child
			UIOperationHistoryUndo:global normal child
			u delayed parent
			UIOperationHistoryUndo:global delayed parent
			r delayed parent
			UIOperationHistoryRedo:global delayed parent
			r normal child
			UIOperationHistoryRedo:global normal child
			r normal parent
			UIOperationHistoryRedo:global normal parent
			r delayed child
			UIOperationHistoryRedo:global delayed child
		]]>),
		log.join('\n')
	);
}

function test_exceptions()
{
	assert.raises('EXCEPTION FROM UNDOABLE OPERATION', function() {
		sv.doOperation(
			function() {
				log.push('op success');
				sv.doOperation(
					function() {
						log.push('op fail');
						throw 'EXCEPTION FROM UNDOABLE OPERATION';
					},
					{ name   : 'cannot redo',
					  label  : 'cannot redo',
					  onUndo : function(aInfo) {
					    log.push('u cannot redo');
					  },
					  onRedo : function(aInfo) {
					    throw 'EXCEPTION FROM REDO PROCESS';
					    log.push('r cannot redo');
					  } }
				);
			},
			{ name   : 'cannot undo',
			  label  : 'cannot undo',
			  onUndo : function(aInfo) {
			    throw 'EXCEPTION FROM UNDO PROCESS';
			    log.push('u cannot undo');
			  },
			  onRedo : function(aInfo) {
			    log.push('r cannot undo');
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
			op success
			op fail
			u cannot redo
			UIOperationHistoryUndo:global cannot redo
			r cannot undo
			UIOperationHistoryRedo:global cannot undo
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

