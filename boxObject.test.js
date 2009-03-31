var namespace = { window : {} };
utils.include('boxObject.js', namespace, 'Shift_JIS');

var sv;

function setUp()
{
	sv = {};
	sv.__proto__ = namespace.window['piro.sakura.ne.jp'].boxObject;

	yield Do(utils.loadURI('fixtures/testcase.html'));
	content.scrollTo(content.scrollMaxX+10, content.scrollMaxY+10);
}

function tearDown()
{
}

function test__getFrameOwnerFromFrame()
{
	assert.equals(gBrowser, sv._getFrameOwnerFromFrame(content));

	yield Do(utils.loadURI('fixtures/frame.html'));
	assert.equals(gBrowser, sv._getFrameOwnerFromFrame(content));
	assert.equals($('frame2'), sv._getFrameOwnerFromFrame(content.frames[1]));
}

function test_getBoxObjectFromClientRectFor()
{
	var box;
	var root = content.document.documentElement;

	var containerBox = gBrowser.boxObject;
	var containerStyle = window.getComputedStyle(gBrowser, null);
	var baseX = containerBox.screenX + parseInt(containerStyle.getPropertyValue('border-left-width').replace('px', ''));
	var baseY = containerBox.screenY + parseInt(containerStyle.getPropertyValue('border-top-width').replace('px', ''));

	function assertBoxObject(aNode)
	{
		if (!('getBoxObjectFor' in content.document)) return;
		var box = sv.getBoxObjectFromClientRectFor(aNode);
		var actualBox = content.document.getBoxObjectFor(aNode);
		assert.equals(
			[actualBox.x, actualBox.y, actualBox.width, actualBox.height, actualBox.screenX, actualBox.screenY],
			[box.x, box.y, box.width, box.height, box.screenX, box.screenY]
		);
	}

	box = sv.getBoxObjectFromClientRectFor($('positionedBoxStatic'));
	assert.equals(2, box.x);
	assert.equals(2, box.y);
	assert.equals(baseX, box.screenX);
	assert.equals(baseY - content.scrollY, box.screenY);
	assert.equals(100 + 2 + 2, box.width);
	assert.equals(100 + 2 + 2, box.height);
//	assertBoxObject($('positionedBoxStatic'));

	box = sv.getBoxObjectFromClientRectFor($('positionedBoxRelative'));
	assert.equals(100 + 3, box.x);
	assert.equals(100 + 2 + 2 + 30 + 3, box.y);
	assert.equals(baseX + 100, box.screenX);
	assert.equals(baseY - content.scrollY + 100 + 2 + 2 + 30, box.screenY);
	assert.equals(100 + 3 + 3, box.width);
	assert.equals(100 + 3 + 3, box.height);
//	assertBoxObject($('positionedBoxAbsolute'));

	box = sv.getBoxObjectFromClientRectFor($('positionedBoxAbsolute'));
	assert.equals(root.offsetWidth - 100 - 4 - 4 - 10 + 4, box.x);
	assert.equals(10 + 4, box.y);
	assert.equals(baseX + root.offsetWidth - 100 - 4 - 4 - 10, box.screenX);
	assert.equals(baseY - content.scrollY + 5 + 5, box.screenY);
	assert.equals(100 + 4 + 4, box.width);
	assert.equals(100 + 4 + 4, box.height);
//	assertBoxObject($('positionedBoxRelative'));

	box = sv.getBoxObjectFromClientRectFor($('positionedBoxFixed'));
	assert.equals(40 + 5, box.x);
	assert.equals(30 + 5, box.y);
	assert.equals(baseX + 40, box.screenX);
	assert.equals(baseY + 30, box.screenY);
	assert.equals(100 + 5 + 5, box.width);
	assert.equals(100 + 5 + 5, box.height);
//	assertBoxObject($('positionedBoxFixed'));
}
