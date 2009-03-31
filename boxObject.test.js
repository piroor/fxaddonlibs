var namespace = { window : {} };
utils.include('boxObject.js', namespace, 'Shift_JIS');

var sv;

function setUp()
{
	sv = {};
	sv.__proto__ = namespace.window['piro.sakura.ne.jp'].boxObject;
}

function tearDown()
{
}

function test__getFrameOwnerFromFrame()
{
}

function test_getBoxObjectFromClientRectFor()
{
}
