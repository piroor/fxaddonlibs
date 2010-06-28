var namespace;

function setUp()
{
	namespace = {};
	utils.include('./jstimer.jsm', namespace);
}

function tearDown()
{
	for (var id in namespace.Timer.instances)
	{
		namespace.Timer.cancel(id);
	}
}

function test_setTimeout()
{
	assert.isFunction(namespace.setTimeout);

	var count = 0;
	var id = namespace.setTimeout(
			function(aValue) {
				count += aValue;
			},
			300,
			1
		);

	assert.equals(0, count);
	yield 400;
	assert.equals(1, count);
	yield 400;
	assert.equals(1, count);
}

function test_clearTimeout()
{
	assert.isFunction(namespace.clearTimeout);

	var count = 0;
	var id = namespace.setTimeout(
			function(aValue) {
				count += aValue;
			},
			300,
			1
		);

	assert.equals(0, count);
	namespace.clearTimeout(id);
	yield 400;
	assert.equals(0, count);
}

test_autoClearTimeout.setUp = function() {
	yield utils.setUpTestWindow();
}
test_autoClearTimeout.tearDown = function() {
	utils.tearDownTestWindow();
}
function test_autoClearTimeout()
{
	var win = utils.getTestWindow();
	var counter = { value : 0 };
	win.test_autoClearIntervalCount = counter;
	win.setTimeout(<![CDATA[
		window.test_autoClearTimeout = function(aValue) {
			window.test_autoClearTimeoutCount.value += aValue;
		};
	]]>.toString(), 0);
	yield 300;
	assert.isFunction(win.test_autoClearTimeout);

	var id = namespace.setTimeout(
			win.test_autoClearTimeout,
			300,
			1
		);
	assert.equals(0, counter.value);
	utils.tearDownTestWindow();
	yield 400;

	assert.isTrue(win.closed);
	assert.equals(0, counter.value);
}

function test_setInterval()
{
	assert.isFunction(namespace.setInterval);

	var count = 0;
	var id = namespace.setInterval(
			function(aValue) {
				count += aValue;
			},
			200,
			1
		);

	assert.equals(0, count);
	yield 500;
	assert.equals(2, count);
}

function test_clearInterval()
{
	assert.isFunction(namespace.clearInterval);

	var count = 0;
	var id = namespace.setInterval(
			function(aValue) {
				count += aValue;
			},
			200,
			1
		);

	assert.equals(0, count);
	namespace.clearInterval(id);
	yield 500;
	assert.equals(0, count);
}

test_autoClearInterval.setUp = function() {
	yield utils.setUpTestWindow();
}
test_autoClearInterval.tearDown = function() {
	utils.tearDownTestWindow();
}
function test_autoClearInterval()
{
	var win = utils.getTestWindow();
	var counter = { value : 0 };
	win.test_autoClearIntervalCount = counter;
	win.setTimeout(<![CDATA[
		window.test_autoClearInterval = function(aValue) {
			window.test_autoClearIntervalCount.value += aValue;
		};
	]]>.toString(), 0);
	yield 300;
	assert.isFunction(win.test_autoClearInterval);

	var id = namespace.setInterval(
			win.test_autoClearInterval,
			200,
			1
		);
	assert.equals(0, counter.value);
	utils.tearDownTestWindow();
	yield 400;

	assert.isTrue(win.closed);
	assert.equals(0, counter.value);
}
