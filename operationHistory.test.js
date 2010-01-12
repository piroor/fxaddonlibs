utils.include('operationHistory.js', 'Shift_JIS');

var sv;
var log;

var win;
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

	window.addEventListener('UIOperationHistoryPreUndo:global', handleEvent, false);
	window.addEventListener('UIOperationHistoryUndo:global', handleEvent, false);
	window.addEventListener('UIOperationHistoryRedo:global', handleEvent, false);
	window.addEventListener('UIOperationHistoryPostRedo:global', handleEvent, false);
}

function tearDown()
{
	window.removeEventListener('UIOperationHistoryPreUndo:global', handleEvent, false);
	window.removeEventListener('UIOperationHistoryUndo:global', handleEvent, false);
	window.removeEventListener('UIOperationHistoryRedo:global', handleEvent, false);
	window.removeEventListener('UIOperationHistoryPostRedo:global', handleEvent, false);
}


test_setGetWindowId.setUp = windowSetUp;
test_setGetWindowId.tearDown = windowTearDown;
function test_setGetWindowId()
{
	sv.setWindowId(win, 'foobar');
	assert.equals('foobar', sv.getWindowId(win));
	assert.equals('foobar', sv.getWindowId(win, 'default'));

	yield Do(windowTearDown());
	yield Do(windowSetUp());

	var id = sv.getWindowId(win, 'foobar');
	assert.isNotNull(id);
	assert.notEquals('', id);

	var newId = sv.getWindowId(win, 'foobar');
	assert.isNotNull(newId);
	assert.equals(id, newId);

	sv.setWindowId(win, 'foobar');
	assert.equals('foobar', sv.getWindowId(win));
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

test_setGetElementId.setUp = windowSetUp;
test_setGetElementId.tearDown = windowTearDown;
function test_setGetElementId()
{
	var element = win.gBrowser;

	sv.setElementId(element, 'foobar');
	assert.equals('foobar', sv.getElementId(element));
	assert.equals('foobar', sv.getElementId(element, 'default'));

	yield Do(windowTearDown());
	yield Do(windowSetUp());
	element = win.gBrowser;

	var id = sv.getElementId(element, 'foobar');
	assert.isNotNull(id);
	assert.notEquals('', id);

	var newId = sv.getElementId(element, 'foobar');
	assert.equals(id, newId);

	sv.setElementId(element, 'foobar');
	assert.equals('foobar', sv.getElementId(element));

	// duplicated id is not allowed.
	newId = sv.setElementId(element.parentNode, 'foobar');
	assert.equals(newId, sv.getElementId(element.parentNode));
	assert.notEquals('foobar', newId);
	assert.notEquals('foobar', sv.getElementId(element.parentNode));
}

test_getElementById.setUp = windowSetUp;
test_getElementById.tearDown = windowTearDown;
function test_getElementById()
{
	var element = win.gBrowser;

	var id = sv.getElementId(element);
	var elementFromId = sv.getElementById(id, win);
	assert.equals(element, elementFromId);

	// returns null for a wrong parent
	elementFromId = sv.getElementById(id, content);
	assert.isNull(elementFromId);

	elementFromId = sv.getElementById('does not exist!', win);
	assert.isNull(elementFromId);
}

test_getId.setUp = windowSetUp;
test_getId.tearDown = windowTearDown;
function test_getId()
{
	var id = sv.getId(win);
	var windowFromId = sv.getWindowById(id);
	assert.equals(win, windowFromId);

	var element = win.gBrowser;

	id = sv.getId(element);
	assert.isNotNull(id);
	var elementFromId = sv.getElementById(id, win);
	assert.equals(element, elementFromId);
}

test_getTargetById.setUp = windowSetUp;
test_getTargetById.tearDown = windowTearDown;
function test_getTargetById()
{
	var element = win.gBrowser;
	var windowId = sv.getId(win);
	var elementId = sv.getId(element);
	assert.equals(win, sv.getTargetById(windowId));
	assert.equals(element, sv.getTargetById(elementId, win));
}

test_getTargetsByIds.setUp = windowSetUp;
test_getTargetsByIds.tearDown = windowTearDown;
function test_getTargetsByIds()
{
	var tabs = [
			win.gBrowser.addTab(),
			win.gBrowser.addTab(),
			win.gBrowser.addTab()
		];
	var ids = tabs.map(function(aTab) {
			return sv.getId(aTab);
		});
	assert.equals(tabs, sv.getTargetsByIds(ids[0], ids[1], ids[2], win.gBrowser.mTabContainer));
	assert.equals(tabs, sv.getTargetsByIds(ids, win.gBrowser.mTabContainer));
	assert.equals([null, null, null], sv.getTargetsByIds(ids[0], ids[1], ids[2], win));
	assert.equals([null, null, null], sv.getTargetsByIds(ids, win));
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

function assertUndoingState(aExpectedUndoing, aExpectedRedoing, aMessage)
{
	if (aExpectedUndoing)
		assert.isTrue(sv.isUndoing(), aMessage);
	else
		assert.isFalse(sv.isUndoing(), aMessage);

	if (aExpectedRedoing)
		assert.isTrue(sv.isRedoing(), aMessage);
	else
		assert.isFalse(sv.isRedoing(), aMessage);

	if (aExpectedUndoing || aExpectedRedoing)
		assert.isFalse(sv.isUndoable(), aMessage);
	else
		assert.isTrue(sv.isUndoable(), aMessage);
}

function test_undoRedo_simple()
{
	assertUndoingState(false, false);

	sv.addEntry({ name   : 'entry 1',
	              label  : 'entry 1',
	              onUndo : function() {
	                log.push('u1');
	                assertUndoingState(true, false);
	              },
	              onRedo : function() {
	                log.push('r1');
	                assertUndoingState(false, true);
	              } });
	sv.addEntry({ name   : 'entry 2',
	              label  : 'entry 2',
	              onPreUndo : function() {
	                log.push('u2pre');
	                assertUndoingState(true, false);
	              },
	              onUndo : function() {
	                log.push('u2');
	                assertUndoingState(true, false);
	              },
	              onRedo : function() {
	                log.push('r2');
	                assertUndoingState(false, true);
	              },
	              onPostRedo : function() {
	                log.push('r2post');
	                assertUndoingState(false, true);
	              } });
	sv.addEntry({ name   : 'entry 3',
	              label  : 'entry 3' });

	assertHistoryCount(2, 3);
	assert.isTrue(sv.undo().done); // entry 3
	assert.isTrue(sv.undo().done); // u2pre, u2
	assertUndoingState(false, false);
	assertHistoryCount(0, 3);
	assert.isTrue(sv.redo().done); // r2, r2post
	assert.isTrue(sv.redo().done); // entry 3
	assertUndoingState(false, false);

	assert.equals(
		toSimpleList(<![CDATA[
			UIOperationHistoryPreUndo:global entry 3
			UIOperationHistoryUndo:global entry 3
			u2pre
			UIOperationHistoryPreUndo:global entry 2
			u2
			UIOperationHistoryUndo:global entry 2
			r2
			UIOperationHistoryRedo:global entry 2
			r2post
			UIOperationHistoryPostRedo:global entry 2
			UIOperationHistoryRedo:global entry 3
			UIOperationHistoryPostRedo:global entry 3
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_goToIndex()
{
	sv.addEntry({ name   : 'entry 1',
	              label  : 'entry 1',
	              onPreUndo : function() { log.push('u1pre'); },
	              onUndo : function() { log.push('u1'); sv.undo(); /* <= this should be ignored */ },
	              onRedo : function() { log.push('r1'); },
	              onPostRedo : function() { log.push('r1post'); } });
	sv.addEntry({ name   : 'entry 2',
	              label  : 'entry 2',
	              onPreUndo : function() { log.push('u2pre'); },
	              onUndo : function() { log.push('u2'); },
	              onRedo : function() { log.push('r2'); sv.redo(); /* <= this should be ignored */ },
	              onPostRedo : function() { log.push('r2post'); sv.redo(); } });
	sv.addEntry({ name   : 'entry 3',
	              label  : 'entry 3',
	              onPreUndo : function() { log.push('u3pre'); sv.undo(); /* <= this should be ignored */ },
	              onUndo : function() { log.push('u3'); sv.undo(); /* <= this should be ignored */ },
	              onRedo : function() { log.push('r3'); sv.redo(); /* <= this should be ignored */ },
	              onPostRedo : function() { log.push('r3post'); sv.redo(); /* <= this should be ignored */ } });

	assertHistoryCount(2, 3);
	sv.undo(); // u3pre, u3
	assertHistoryCount(1, 3);
	sv.redo(); // r3, r3post
	assertHistoryCount(2, 3);
	sv.undo(); // u3pre, u3
	assertHistoryCount(1, 3);
	sv.undo(); // u2pre, u2
	assertHistoryCount(0, 3);
	sv.undo(); // u1pre, u1
	assertHistoryCount(0, 3);
	sv.redo(); // r1, r1post
	assertHistoryCount(0, 3);
	sv.redo(); // r2, r2post
	assertHistoryCount(1, 3);
	sv.redo(); // r3, r3post
	assertHistoryCount(2, 3);
	sv.redo(); // --
	assertHistoryCount(2, 3);
	sv.redo(); // --
	assertHistoryCount(2, 3);
	sv.undo(); // u3pre, u3
	assertHistoryCount(1, 3);
	sv.undo(); // u2pre, u2
	assertHistoryCount(0, 3);
	sv.undo(); // u1pre, u1
	assertHistoryCount(0, 3);
	sv.undo(); // --
	assertHistoryCount(0, 3);
	sv.undo(); // --
	assertHistoryCount(0, 3);
	sv.undo(); // --
	assertHistoryCount(0, 3);
	sv.redo(); // r1, r1post
	assertHistoryCount(0, 3);
	sv.redo(); // r2, r2post
	assertHistoryCount(1, 3);

	log.push('----insert');
	sv.addEntry({ name   : 'entry 4',
	              label  : 'entry 4',
	              onPreUndo : function() { log.push('u4pre'); sv.addEntry({ label: 'invalid/undo' }); },
	              onUndo : function() { log.push('u4'); sv.addEntry({ label: 'invalid/undo' }); },
	              onRedo : function() { log.push('r4'); sv.addEntry({ label: 'invalid/redo' }); },
	              onPostRedo : function() { log.push('r4post'); sv.addEntry({ label: 'invalid/redo' }); } });
	assertHistoryCount(2, 3);
	sv.undo(); // u4pre, u4
	assertHistoryCount(1, 3);
	sv.redo(); // r4, r4post
	assertHistoryCount(2, 3);
	sv.undo(); // u4pre, u4
	assertHistoryCount(1, 3);
	sv.undo(); // u2pre, u2
	assertHistoryCount(0, 3);
	sv.undo(); // u1pre, u1
	assertHistoryCount(0, 3);
	sv.redo(); // r1, r1post
	assertHistoryCount(0, 3);
	sv.redo(); // r2, r2post
	assertHistoryCount(1, 3);
	sv.redo(); // r4, r4post
	assertHistoryCount(2, 3);

	log.push('----goToIndex back');
	sv.goToIndex(0);
	log.push('----goToIndex forward');
	sv.goToIndex(2);

	assert.equals(
		toSimpleList(<![CDATA[
			u3pre
			UIOperationHistoryPreUndo:global entry 3
			u3
			UIOperationHistoryUndo:global entry 3
			r3
			UIOperationHistoryRedo:global entry 3
			r3post
			UIOperationHistoryPostRedo:global entry 3
			u3pre
			UIOperationHistoryPreUndo:global entry 3
			u3
			UIOperationHistoryUndo:global entry 3
			u2pre
			UIOperationHistoryPreUndo:global entry 2
			u2
			UIOperationHistoryUndo:global entry 2
			u1pre
			UIOperationHistoryPreUndo:global entry 1
			u1
			UIOperationHistoryUndo:global entry 1
			r1
			UIOperationHistoryRedo:global entry 1
			r1post
			UIOperationHistoryPostRedo:global entry 1
			r2
			UIOperationHistoryRedo:global entry 2
			r2post
			UIOperationHistoryPostRedo:global entry 2
			r3
			UIOperationHistoryRedo:global entry 3
			r3post
			UIOperationHistoryPostRedo:global entry 3
			u3pre
			UIOperationHistoryPreUndo:global entry 3
			u3
			UIOperationHistoryUndo:global entry 3
			u2pre
			UIOperationHistoryPreUndo:global entry 2
			u2
			UIOperationHistoryUndo:global entry 2
			u1pre
			UIOperationHistoryPreUndo:global entry 1
			u1
			UIOperationHistoryUndo:global entry 1
			r1
			UIOperationHistoryRedo:global entry 1
			r1post
			UIOperationHistoryPostRedo:global entry 1
			r2
			UIOperationHistoryRedo:global entry 2
			r2post
			UIOperationHistoryPostRedo:global entry 2
			----insert
			u4pre
			UIOperationHistoryPreUndo:global entry 4
			u4
			UIOperationHistoryUndo:global entry 4
			r4
			UIOperationHistoryRedo:global entry 4
			r4post
			UIOperationHistoryPostRedo:global entry 4
			u4pre
			UIOperationHistoryPreUndo:global entry 4
			u4
			UIOperationHistoryUndo:global entry 4
			u2pre
			UIOperationHistoryPreUndo:global entry 2
			u2
			UIOperationHistoryUndo:global entry 2
			u1pre
			UIOperationHistoryPreUndo:global entry 1
			u1
			UIOperationHistoryUndo:global entry 1
			r1
			UIOperationHistoryRedo:global entry 1
			r1post
			UIOperationHistoryPostRedo:global entry 1
			r2
			UIOperationHistoryRedo:global entry 2
			r2post
			UIOperationHistoryPostRedo:global entry 2
			r4
			UIOperationHistoryRedo:global entry 4
			r4post
			UIOperationHistoryPostRedo:global entry 4
			----goToIndex back
			u4pre
			UIOperationHistoryPreUndo:global entry 4
			u4
			UIOperationHistoryUndo:global entry 4
			u2pre
			UIOperationHistoryPreUndo:global entry 2
			u2
			UIOperationHistoryUndo:global entry 2
			----goToIndex forward
			r2
			UIOperationHistoryRedo:global entry 2
			r2post
			UIOperationHistoryPostRedo:global entry 2
			r4
			UIOperationHistoryRedo:global entry 4
			r4post
			UIOperationHistoryPostRedo:global entry 4
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
	log.push('----');
	assertHistoryCount(2, 4);
	sv.undo(); // u both, u undo, u redo
	log.push('----');
	assertHistoryCount(0, 4);
	sv.redo(); // r redo, r undo
	log.push('----');
	assertHistoryCount(1, 4);
	sv.redo(); // r both, r normal
	assertHistoryCount(3, 4);

	assert.equals(
		toSimpleList(<![CDATA[
			UIOperationHistoryPreUndo:global normal
			u normal
			UIOperationHistoryUndo:global normal
			----
			UIOperationHistoryPreUndo:global skip both
			u both
			UIOperationHistoryUndo:global skip both
			UIOperationHistoryPreUndo:global skip undo
			u undo
			UIOperationHistoryUndo:global skip undo
			UIOperationHistoryPreUndo:global skip redo
			u redo
			UIOperationHistoryUndo:global skip redo
			----
			r redo
			UIOperationHistoryRedo:global skip redo
			UIOperationHistoryPostRedo:global skip redo
			r undo
			UIOperationHistoryRedo:global skip undo
			UIOperationHistoryPostRedo:global skip undo
			----
			r both
			UIOperationHistoryRedo:global skip both
			UIOperationHistoryPostRedo:global skip both
			r normal
			UIOperationHistoryRedo:global normal
			UIOperationHistoryPostRedo:global normal
		]]>),
		log.join('\n')
	);
}

function test_undoRedo_wait()
{
	sv.addEntry({ name   : 'normal',
	              label  : 'normal' });
	sv.addEntry({
	              name   : 'delayed',
	              label  : 'delayed',
	              onPreUndo : function(aInfo) {
	                aInfo.wait();
	                window.setTimeout(function() {
	                  aInfo.continue();
	                }, 300);
	              },
	              onRedo : function(aInfo) {
	                aInfo.wait();
	                window.setTimeout(function() {
	                  aInfo.continue();
	                }, 300);
	              }
	            });

	assertHistoryCount(1, 2);

	var info;

	assertUndoingState(false, false);

	info = sv.undo();
	assertHistoryCount(0, 2);
	assert.isFalse(info.done);
	assertUndoingState(true, false);
	log.push('--waiting');
	yield 600;
	assert.isTrue(info.done);
	assertUndoingState(false, false);

	log.push('----');
	info = sv.redo();
	assertHistoryCount(1, 2);
	assert.isFalse(info.done);
	assertUndoingState(false, true);
	log.push('--waiting');
	yield 600;
	assert.isTrue(info.done);
	assertUndoingState(false, false);

	assert.equals(
		toSimpleList(<![CDATA[
			UIOperationHistoryPreUndo:global delayed
			--waiting
			UIOperationHistoryUndo:global delayed
			----
			UIOperationHistoryRedo:global delayed
			--waiting
			UIOperationHistoryPostRedo:global delayed
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
						  label  : 'deep' }
					);
					// If the operation returns false,
					// it should not be registered to the history.
					sv.doOperation(
						function() {
							log.push('canceled operation');
							return false;
						},
						{ name   : 'canceled',
						  label  : 'canceled' }
					);
				},
				{ name   : 'child',
				  label  : 'child',
				  onUndo : function(aInfo) {
				    log.push('--canceled');
				    return false;
				  },
				  onPostRedo : function(aInfo) {
				    log.push('--canceled');
				    return false;
				  } }
			);
		},
		{ name   : 'parent',
		  label  : 'parent' }
	);
	assert.isTrue(info.done);

	var history = sv.getHistory();
	assert.equals(1, history.entries.length, utils.inspect(history.entries));
	assert.equals('parent', history.entries[0].label, utils.inspect(history.entries[0]));

	log.push('----');
	sv.undo();
	log.push('----');
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			parent operation
			child operation
			deep operation
			canceled operation
			----
			UIOperationHistoryPreUndo:global parent
			UIOperationHistoryPreUndo:global child
			UIOperationHistoryPreUndo:global deep
			UIOperationHistoryUndo:global deep
			--canceled
			----
			UIOperationHistoryRedo:global parent
			UIOperationHistoryRedo:global child
			UIOperationHistoryRedo:global deep
			UIOperationHistoryPostRedo:global deep
			--canceled
		]]>),
		log.join('\n')
	);
}

function handlEvent_cancel(aEvent) {
	if (aEvent.entry.name == 'child') {
		aEvent.preventDefault();
		log.push('--canceled');
	}
}
test_doOperation_canceledByEventListener.setUp = function() {
	window.addEventListener('UIOperationHistoryUndo:global', handlEvent_cancel, false);
	window.addEventListener('UIOperationHistoryPostRedo:global', handlEvent_cancel, false);
}
test_doOperation_canceledByEventListener.tearDown = function() {
	window.removeEventListener('UIOperationHistoryUndo:global', handlEvent_cancel, false);
	window.removeEventListener('UIOperationHistoryPostRedo:global', handlEvent_cancel, false);
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
						  label  : 'deep' }
					);
				},
				{ name   : 'child',
				  label  : 'child' }
			);
		},
		{ name   : 'parent',
		  label  : 'parent' }
	);
	assert.isTrue(info.done);

	var history = sv.getHistory();
	assert.equals(1, history.entries.length, utils.inspect(history.entries));
	assert.equals('parent', history.entries[0].label, utils.inspect(history.entries[0]));

	log.push('----');
	sv.undo();
	log.push('----');
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			parent operation
			child operation
			deep operation
			----
			UIOperationHistoryPreUndo:global parent
			UIOperationHistoryPreUndo:global child
			UIOperationHistoryPreUndo:global deep
			UIOperationHistoryUndo:global deep
			UIOperationHistoryUndo:global child
			--canceled
			----
			UIOperationHistoryRedo:global parent
			UIOperationHistoryRedo:global child
			UIOperationHistoryRedo:global deep
			UIOperationHistoryPostRedo:global deep
			UIOperationHistoryPostRedo:global child
			--canceled
		]]>),
		log.join('\n')
	);
}

function test_doOperation_wait()
{
	var info;

	info = sv.doOperation(
		function(aInfo) {
			log.push('op delayed parent');
			aInfo.wait();
			var info = sv.doOperation(
				function(aInfo) {
					log.push('op normal child');
				},
				{ name   : 'normal child',
				  label  : 'normal child' }
			);
			window.setTimeout(function() {
			  aInfo.continue();
			}, 300);
			assert.isTrue(info.done);
		},
		{ name   : 'delayed parent',
		  label  : 'delayed parent' }
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
				  label  : 'delayed child' }
			);
			assert.isFalse(info.done);
		},
		{ name   : 'normal parent',
		  label  : 'normal parent' }
	);
	assert.isTrue(info.done);

	log.push('----');
	sv.undo();
	log.push('----');
	sv.undo();
	log.push('----');
	sv.redo();
	log.push('----');
	sv.redo();

	assert.equals(
		toSimpleList(<![CDATA[
			op delayed parent
			op normal child
			op normal parent
			op delayed child
			----
			UIOperationHistoryPreUndo:global normal parent
			UIOperationHistoryPreUndo:global delayed child
			UIOperationHistoryUndo:global delayed child
			UIOperationHistoryUndo:global normal parent
			----
			UIOperationHistoryPreUndo:global delayed parent
			UIOperationHistoryPreUndo:global normal child
			UIOperationHistoryUndo:global normal child
			UIOperationHistoryUndo:global delayed parent
			----
			UIOperationHistoryRedo:global delayed parent
			UIOperationHistoryRedo:global normal child
			UIOperationHistoryPostRedo:global normal child
			UIOperationHistoryPostRedo:global delayed parent
			----
			UIOperationHistoryRedo:global normal parent
			UIOperationHistoryRedo:global delayed child
			UIOperationHistoryPostRedo:global delayed child
			UIOperationHistoryPostRedo:global normal parent
		]]>),
		log.join('\n')
	);
}

test_fakeUndoRedo.setUp = windowSetUp;
test_fakeUndoRedo.tearDown = windowTearDown;
function test_fakeUndoRedo()
{
	var parent = [];
	var child = [];

	sv.doOperation(
		function(aInfo) {
			sv.doOperation(
				function(aInfo) {
				},
				win,
				(child[0] = {
					name  : 'child0',
					label : 'child0'
				})
			);
		},
		win,
		(parent[0] = {
			name  : 'parent0',
			label : 'parent0'
		})
	);
	sv.doOperation(
		function(aInfo) {
			sv.doOperation(
				function(aInfo) {
				},
				win,
				(child[1] = {
					name  : 'child1',
					label : 'child1'
				})
			);
		},
		win,
		(parent[1] = {
			name  : 'parent1',
			label : 'parent1'
		})
	);
	sv.doOperation(
		function(aInfo) {
			sv.doOperation(
				function(aInfo) {
				},
				win,
				(child[2] = {
					name  : 'child2',
					label : 'child2'
				})
			);
		},
		win,
		(parent[2] = {
			name  : 'parent2',
			label : 'parent2'
		})
	);

	var history = sv.getHistory(win);
	assert.equals(2, history.index);

	function assertFakeUndoSuccess(aCurrent, aEntry, aExpected)
	{
		history.index = aCurrent;
		sv.fakeUndo(aEntry, win);
		assert.equals(aExpected, history.index);
		assert.equals([], log);
	}

	function assertFakeUndoFail(aCurrent, aEntry)
	{
		history.index = aCurrent;
		sv.fakeUndo(aEntry, win);
		var current = Math.min(aCurrent, history.entries.length-1);
		assert.equals(current, history.index);
		assert.equals([], log);
	}

	assertFakeUndoFail(2, parent[0]);
	assertFakeUndoSuccess(2, parent[1], 0);
	assertFakeUndoSuccess(2, parent[2], 1);
	assertFakeUndoFail(3, parent[0]);
	assertFakeUndoFail(3, parent[1]);
	assertFakeUndoSuccess(3, parent[2], 1);

	assertFakeUndoFail(2, child[0]);
	assertFakeUndoSuccess(2, child[1], 0);
	assertFakeUndoSuccess(2, child[2], 1);
	assertFakeUndoFail(3, child[0]);
	assertFakeUndoFail(3, child[1]);
	assertFakeUndoSuccess(3, child[2], 1);

	function assertFakeRedoSuccess(aCurrent, aEntry, aExpected)
	{
		history.index = aCurrent;
		sv.fakeRedo(aEntry, win);
		assert.equals(aExpected, history.index);
		assert.equals([], log);
	}

	function assertFakeRedoFail(aCurrent, aEntry)
	{
		history.index = aCurrent;
		sv.fakeRedo(aEntry, win);
		var current = Math.max(aCurrent, 0);
		assert.equals(current, history.index);
		assert.equals([], log);
	}

	assertFakeRedoSuccess(-1, parent[0], 1);
	assertFakeRedoFail(-1, parent[1]);
	assertFakeRedoFail(-1, parent[2]);
	assertFakeRedoSuccess(0, parent[0], 1);
	assertFakeRedoSuccess(0, parent[1], 2);
	assertFakeRedoFail(0, parent[2]);

	assertFakeRedoSuccess(-1, child[0], 1);
	assertFakeRedoFail(-1, child[1]);
	assertFakeRedoFail(-1, child[2]);
	assertFakeRedoSuccess(0, child[0], 1);
	assertFakeRedoSuccess(0, child[1], 2);
	assertFakeRedoFail(0, child[2]);
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
			UIOperationHistoryPreUndo:global cannot undo
			UIOperationHistoryPreUndo:global cannot redo
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

