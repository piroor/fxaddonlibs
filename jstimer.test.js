var namespace;

function setUp()
{
	namespace = {};
	utils.include('./jstimer.jsm', namespace);
}

function tearDown()
{
}

function test_setTimeout()
{
	assert.isFunction(namespace.setTimeout);

	var done = false;
	var value = null;
	var id = namespace.setTimeout(
			function(aValue) {
				done = true;
				value = aValue;
			},
			300,
			true
		);

	assert.isFalse(done);
	assert.isNull(value);
	yield 600;
	assert.isTrue(done);
	assert.isTrue(value);
}

function test_clearTimeout()
{
	assert.isFunction(namespace.clearTimeout);

	var done = false;
	var value = null;
	var id = namespace.setTimeout(
			function(aValue) {
				done = true;
				value = aValue;
			},
			300,
			true
		);

	assert.isFalse(done);
	assert.isNull(value);
	namespace.clearTimeout(id);
	yield 600;
	assert.isFalse(done);
	assert.isNull(value);
}

function test_setInterval()
{
	assert.isFunction(namespace.setInterval);

	var count = 0;
	var values = [];
	var id = namespace.setInterval(
			function(aValue) {
				count++;
				values.push(aValue);
			},
			200,
			true
		);

	assert.equals(0, count);
	assert.equals([], values);
	yield 500;
	assert.equals(2, count);
	assert.equals([true, true], values);
}

function test_clearInterval()
{
	assert.isFunction(namespace.clearInterval);

	var count = 0;
	var values = [];
	var id = namespace.setInterval(
			function(aValue) {
				count++;
				values.push(aValue);
			},
			200,
			true
		);

	assert.equals(0, count);
	assert.equals([], values);
	namespace.clearInterval(id);
	yield 500;
	assert.equals(0, count);
	assert.equals([], values);
}
