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
};
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
