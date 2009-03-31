var namespace = { window : {} };
utils.include('boxObject.js', namespace, 'Shift_JIS');

var sv;

function setUp()
{
	sv = {};
	sv.__proto__ = namespace.window['piro.sakura.ne.jp'].boxObject;

	yield Do(utils.loadURI('fixtures/testcase.html'));
	content.scrollTo(content.scrollMaxX, content.scrollMaxY);
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

	function assertBoxObject(aNode)
	{
		if (!('getBoxObjectFor' in content.document)) return;
		var box = sv.getBoxObjectFromClientRectFor(aNode);
		var actualBox = content.document.getBoxObjectFor(aNode);
		for (var i in box)
		{
			assert.inDelta(actualBox[i], box[i], 3, i);
		}
	}

	assertBoxObject($('positionedBoxStatic'));
	box = sv.getBoxObjectFromClientRectFor($('positionedBoxStatic'));
	assert.equals(2, box.x);
	assert.equals(2, box.y);
	assert.equals(containerBox.screenX, box.screenX);
	assert.equals(containerBox.screenY - content.scrollY, box.screenY);
	assert.equals(100 + 4, box.width);
	assert.equals(100 + 4, box.height);

	assertBoxObject($('positionedBoxAbsolute'));
	box = sv.getBoxObjectFromClientRectFor($('positionedBoxRelative'));
	assert.equals(100 + 2, box.x);
	assert.equals(100 + 4 + 30 + 2, box.y);
	assert.equals(containerBox.screenX + 100, box.screenX);
	assert.equals(containerBox.screenY - content.scrollY + 100 + 4 + 30, box.screenY);
	assert.equals(100 + 4, box.width);
	assert.equals(100 + 4, box.height);

	assertBoxObject($('positionedBoxRelative'));
	box = sv.getBoxObjectFromClientRectFor($('positionedBoxAbsolute'));
	assert.equals(root.offsetWidth - 100 - 4 - 10 + 2, box.x);
	assert.equals(10 + 2, box.y);
	assert.equals(containerBox.screenX + root.offsetWidth - 100 - 4 - 10, box.screenX);
	assert.equals(containerBox.screenY - content.scrollY + 10, box.screenY);
	assert.equals(100 + 4, box.width);
	assert.equals(100 + 4, box.height);

	assertBoxObject($('positionedBoxFixed'));
	box = sv.getBoxObjectFromClientRectFor($('positionedBoxFixed'));
	assert.equals(40 + 2, box.x);
	assert.equals(30 + 2, box.y);
	assert.equals(containerBox.screenX + 40, box.screenX);
	assert.equals(containerBox.screenY + 30, box.screenY);
	assert.equals(100 + 4, box.width);
	assert.equals(100 + 4, box.height);
}
