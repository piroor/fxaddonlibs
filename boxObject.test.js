var namespace = { window : {} };
utils.include('boxObject.js', namespace, 'Shift_JIS');

var sv;

function setUp()
{
	sv = {};
	sv.__proto__ = namespace.window['piro.sakura.ne.jp'].boxObject;

	yield Do(utils.loadURI('fixtures/box.html'));
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
	assert.equals($('frame2'), sv._getFrameOwnerFromFrame($('frame2').contentWindow));
}

function test_getBoxObjectFromBoxObjectFor()
{
	var originalBox = gBrowser.boxObject;
	var box = {
			x       : originalBox.x,
			y       : originalBox.y,
			width   : originalBox.width,
			height  : originalBox.height,
			screenX : originalBox.screenX,
			screenY : originalBox.screenY
		};
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(gBrowser, false));
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(gBrowser));

	var style = gBrowser.ownerDocument.defaultView.getComputedStyle(gBrowser, null);
	box.left = box.x - parseInt(style.getPropertyValue('border-left-width').replace('px', ''));
	box.top = box.y - parseInt(style.getPropertyValue('border-top-width').replace('px', ''));
	box.right = box.left + box.width;
	box.bottom = box.top + box.height;
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(gBrowser, true));
}

function test_getBoxObjectFromClientRectFor()
{
	var box;
	var root = content.document.documentElement;

	var containerBox = gBrowser.boxObject;
	var containerStyle = window.getComputedStyle(gBrowser, null);
	var baseX = containerBox.screenX + parseInt(containerStyle.getPropertyValue('border-left-width').replace('px', ''));
	var baseY = containerBox.screenY + parseInt(containerStyle.getPropertyValue('border-top-width').replace('px', ''));

	function assertBoxObject(aActualBox, aNode)
	{
		var box = { x : aActualBox.x, y : aActualBox.y, width : aActualBox.width, height : aActualBox.height, screenX : aActualBox.screenX, screenY : aActualBox.screenY };
		assert.equals(box, sv.getBoxObjectFromClientRectFor(aNode, false));
		assert.equals(aActualBox, sv.getBoxObjectFromClientRectFor(aNode, true));
		assert.equals(box, sv.getBoxObjectFromClientRectFor(aNode));
	}

	function assertCompareBoxObjects(aNode)
	{
		if (!('getBoxObjectFor' in content.document)) return;
		var box = sv.getBoxObjectFromClientRectFor(aNode, true);
		var actualBox = sv.getBoxObjectFromBoxObjectFor(aNode, true);
		assert.equals(actualBox, box);
	}

	assertBoxObject(
		{
			x       : 2,
			y       : 2,
			width   : 100 + 2 + 2,
			height  : 100 + 2 + 2,
			screenX : baseX,
			screenY : baseY - content.scrollY,
			left    : 0 - content.scrollX,
			top     : 0 - content.scrollY,
			right   : 100 + 2 + 2 - content.scrollX,
			bottom  : 100 + 2 + 2 - content.scrollY
		},
		$('positionedBoxStatic')
	);
//	assertCompareBoxObjects($('positionedBoxStatic'));

	assertBoxObject(
		{
			x       : 100 + 3,
			y       : 100 + 2 + 2 + 30 + 3,
			width   : 100 + 3 + 3,
			height  : 100 + 3 + 3,
			screenX : baseX + 100,
			screenY : baseY - content.scrollY + 100 + 2 + 2 + 30,
			left    : 100 - content.scrollX,
			top     : 100 + 2 + 2 - content.scrollY + 30,
			right   : 100 - content.scrollX + 100 + 3 + 3,
			bottom  : 100 + 2 + 2 - content.scrollY + 30 + 100 + 3 + 3
		},
		$('positionedBoxRelative')
	);
//	assertCompareBoxObjects($('positionedBoxRelative'));

	assertBoxObject(
		{
			x       : root.offsetWidth - 100 - 4 - 4 - 10 + 4,
			y       : 10 + 4,
			width   : 100 + 4 + 4,
			height  : 100 + 4 + 4,
			screenX : baseX + root.offsetWidth - 100 - 4 - 4 - 10,
			screenY : baseY - content.scrollY + 5 + 5,
			left    : root.offsetWidth - 100 - 4 - 4 - 10 - content.scrollX,
			top     : 10 - content.scrollY,
			right   : root.offsetWidth - 100 - 4 - 4 - 10 - content.scrollX + 100 + 4 + 4,
			bottom  : 10 - content.scrollY + 100 + 4 + 4
		},
		$('positionedBoxAbsolute')
	);
//	assertCompareBoxObjects($('positionedBoxAbsolute'));

	assertBoxObject(
		{
			x       : 40 + 5,
			y       : 30 + 5,
			width   : 100 + 5 + 5,
			height  : 100 + 5 + 5,
			screenX : baseX + 40,
			screenY : baseY + 30,
			left    : 40,
			top     : 30,
			right   : 100 + 5 + 5 + 40,
			bottom  : 100 + 5 + 5 + 30
		},
		$('positionedBoxFixed')
	);
//	assertCompareBoxObjects($('positionedBoxFixed'));
}
