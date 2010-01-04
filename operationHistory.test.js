var sv;
var win;

var windowSetUp = function() {
	yield Do(utils.setUpTestWindow());
	win = utils.getTestWindow();
};
var windowTearDown = function() {
	yield Do(utils.tearDownTestWindow());
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
