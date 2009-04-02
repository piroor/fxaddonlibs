var namespace = { window : {} };
utils.include('boxObject.js', namespace, 'Shift_JIS');

var sv;
var markupDocumentViewer;

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


function getRect(aNode)
{
	var rect = aNode.getBoundingClientRect();
	return {
			left   : Math.round(rect.left),
			top    : Math.round(rect.top),
			right  : Math.round(rect.right),
			bottom : Math.round(rect.bottom)
		};
}

function getRectFromBoxObject(aBoxObject, aNode)
{
	var style = aNode.ownerDocument.defaultView.getComputedStyle(aNode, null);
	var rect = {
			left : aBoxObject.x - parseInt(style.getPropertyValue('border-left-width').replace('px', '')),
			top  : aBoxObject.y - parseInt(style.getPropertyValue('border-top-width').replace('px', ''))
		};
	rect.right  = rect.left + aBoxObject.width;
	rect.bottom = rect.top + aBoxObject.height;
	return rect;
}

function assertNearlyEqualBox(aExpected, aActual)
{
	var props = [];
	for (var i in aExpected)
	{
		props.push(i);
		assert.inDelta(aExpected[i], aActual[i], 2, i);
	}
	for (var j in aActual)
	{
		assert.compare(-1, '<', props.indexOf(j), j);
	}
}

test_getBoxObjectFromBoxObjectFor.setUp = function()
{
	yield Do(utils.loadURI('fixtures/box.xul'));
}
function test_getBoxObjectFromBoxObjectFor()
{
	var button = $('button');
	var originalBox = button.boxObject;
	var box = {
			x       : originalBox.x,
			y       : originalBox.y,
			width   : originalBox.width,
			height  : originalBox.height,
			screenX : originalBox.screenX,
			screenY : originalBox.screenY
		};
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(button, false));
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(button));

	var rect = getRectFromBoxObject(box, button);
	assertNearlyEqualBox(getRect(button), rect);

	for (var i in rect)
	{
		box[i] = rect[i];
	}
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(button, true));
}

function test_getBoxObjectFromClientRectFor()
{
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
}

test_getBoxObjectFromSomethingFor_withZoom.setUp = function()
{
	utils.setPref('browser.zoom.full', true);
	markupDocumentViewer = content
		.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIWebNavigation)
		.QueryInterface(Ci.nsIDocShell)
		.contentViewer
		.QueryInterface(Ci.nsIMarkupDocumentViewer);
	markupDocumentViewer.fullZoom = 0.5;
}
test_getBoxObjectFromSomethingFor_withZoom.tearDown = function()
{
	markupDocumentViewer.fullZoom = 1;
	markupDocumentViewer = null;
}
function test_getBoxObjectFromSomethingFor_withZoom()
{
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

	assertBoxObject(
		{
			x       : 2,
			y       : 2,
			width   : 100 + 2 + 2,
			height  : 100 + 2 + 2,
			screenX : baseX,
			screenY : baseY + (-content.scrollY * 0.5),
			left    : 0 - content.scrollX,
			top     : 0 - content.scrollY,
			right   : 100 + 2 + 2 - content.scrollX,
			bottom  : 100 + 2 + 2 - content.scrollY
		},
		$('positionedBoxStatic')
	);

	assertBoxObject(
		{
			x       : 100 + 3,
			y       : 100 + 2 + 2 + 30 + 3,
			width   : 100 + 3 + 3,
			height  : 100 + 3 + 3,
			screenX : baseX + (100 * 0.5),
			screenY : baseY + ((-content.scrollY + 100 + 2 + 2 + 30) * 0.5),
			left    : 100 - content.scrollX,
			top     : 100 + 2 + 2 - content.scrollY + 30,
			right   : 100 - content.scrollX + 100 + 3 + 3,
			bottom  : 100 + 2 + 2 - content.scrollY + 30 + 100 + 3 + 3
		},
		$('positionedBoxRelative')
	);

	assertBoxObject(
		{
			x       : root.offsetWidth - 100 - 4 - 4 - 10 + 4,
			y       : 10 + 4,
			width   : 100 + 4 + 4,
			height  : 100 + 4 + 4,
			screenX : baseX + ((root.offsetWidth - 100 - 4 - 4 - 10) * 0.5),
			screenY : baseY + ((-content.scrollY + 5 + 5) * 0.5),
			left    : root.offsetWidth - 100 - 4 - 4 - 10 - content.scrollX,
			top     : 10 - content.scrollY,
			right   : root.offsetWidth - 100 - 4 - 4 - 10 - content.scrollX + 100 + 4 + 4,
			bottom  : 10 - content.scrollY + 100 + 4 + 4
		},
		$('positionedBoxAbsolute')
	);

	assertBoxObject(
		{
			x       : 40 + 5,
			y       : 30 + 5,
			width   : 100 + 5 + 5,
			height  : 100 + 5 + 5,
			screenX : baseX + (40 * 0.5),
			screenY : baseY + (30 * 0.5),
			left    : 40,
			top     : 30,
			right   : 100 + 5 + 5 + 40,
			bottom  : 100 + 5 + 5 + 30
		},
		$('positionedBoxFixed')
	);

/*
	function assertCompareBoxObjects(aNode)
	{
		var actualBox = sv.getBoxObjectFromBoxObjectFor(aNode, true);
		var box = sv.getBoxObjectFromClientRectFor(aNode, true);
		assert.equals(actualBox, box);
	}

	assertCompareBoxObjects($('positionedBoxStatic'));
	assertCompareBoxObjects($('positionedBoxRelative'));
	assertCompareBoxObjects($('positionedBoxAbsolute'));
	assertCompareBoxObjects($('positionedBoxFixed'));
*/
}
