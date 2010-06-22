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

test_getBoxObjectFromBoxObjectFor.setUp = function()
{
	yield Do(utils.loadURI('fixtures/box.xul'));
}
function test_getBoxObjectFromBoxObjectFor()
{
	var button = $('button');
	var originalBox = button.boxObject;
	var box = {
			element : button,
			x       : originalBox.x,
			y       : originalBox.y,
			width   : originalBox.width,
			height  : originalBox.height,
			screenX : originalBox.screenX,
			screenY : originalBox.screenY
		};
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(button, false));
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(button));

	var rect = button.getBoundingClientRect();
	box.left   = Math.ceil(rect.left);
	box.top    = Math.ceil(rect.top);
	box.right  = Math.ceil(rect.right);
	box.bottom = Math.ceil(rect.bottom);
	assert.equals(box, sv.getBoxObjectFromBoxObjectFor(button, true));
}

function assertNearlyEqualBox(aExpected, aActual)
{
	assert.equals(aExpected.x, aActual.x);
	assert.equals(aExpected.y, aActual.y);
	assert.equals(aExpected.width, aActual.width);
	assert.equals(aExpected.height, aActual.height);
	if ('left' in aExpected) {
		assert.equals(aExpected.left, aActual.left);
		assert.equals(aExpected.right, aActual.right);
		assert.equals(aExpected.top, aActual.top);
		assert.equals(aExpected.bottom, aActual.bottom);
	}
	assert.inDelta(aExpected.screenY, aActual.screenY, 1);
	assert.inDelta(aExpected.screenX, aActual.screenX, 1);
}

function assertBoxObjectFromClientRect(aZoom)
{
	var root = content.document.documentElement;

	var containerBox = gBrowser.boxObject;
	var containerStyle = window.getComputedStyle(gBrowser, null);
	var baseX = containerBox.screenX + parseInt(containerStyle.getPropertyValue('border-left-width').replace('px', ''));
	var baseY = containerBox.screenY + parseInt(containerStyle.getPropertyValue('border-top-width').replace('px', ''));

	function assertBoxObject(aActualBox, aNode)
	{
		var box = {
				element : aNode,
				x       : aActualBox.x,
				y       : aActualBox.y,
				width   : aActualBox.width,
				height  : aActualBox.height,
				screenX : aActualBox.screenX,
				screenY : aActualBox.screenY
			};
		if (aZoom == 1) {
			assert.equal(box, sv.getBoxObjectFromClientRectFor(aNode, false));
			assert.equal(aActualBox, sv.getBoxObjectFromClientRectFor(aNode, true));
			assert.equal(box, sv.getBoxObjectFromClientRectFor(aNode));
		}
		else {
			assertNearlyEqualBox(box, sv.getBoxObjectFromClientRectFor(aNode, false));
			assertNearlyEqualBox(aActualBox, sv.getBoxObjectFromClientRectFor(aNode, true));
			assertNearlyEqualBox(box, sv.getBoxObjectFromClientRectFor(aNode));
		}
	}

	assertBoxObject(
		{
			element : $('positionedBoxStatic'),
			x       : 2,
			y       : 2,
			width   : 100 + 2 + 2,
			height  : 100 + 2 + 2,
			screenX : baseX,
			screenY : baseY + (-content.scrollY * aZoom),
			left    : 0 - content.scrollX,
			top     : 0 - content.scrollY,
			right   : 100 + 2 + 2 - content.scrollX,
			bottom  : 100 + 2 + 2 - content.scrollY
		},
		$('positionedBoxStatic')
	);

	assertBoxObject(
		{
			element : $('positionedBoxRelative'),
			x       : 100 + 3,
			y       : 100 + 2 + 2 + 30 + 3,
			width   : 100 + 3 + 3,
			height  : 100 + 3 + 3,
			screenX : baseX + (100 * aZoom),
			screenY : baseY + ((-content.scrollY + 100 + 2 + 2 + 30) * aZoom),
			left    : 100 - content.scrollX,
			top     : 100 + 2 + 2 - content.scrollY + 30,
			right   : 100 - content.scrollX + 100 + 3 + 3,
			bottom  : 100 + 2 + 2 - content.scrollY + 30 + 100 + 3 + 3
		},
		$('positionedBoxRelative')
	);

	assertBoxObject(
		{
			element : $('positionedBoxAbsolute'),
			x       : root.offsetWidth - 100 - 4 - 4 - 10 + 4,
			y       : 10 + 4,
			width   : 100 + 4 + 4,
			height  : 100 + 4 + 4,
			screenX : baseX + ((root.offsetWidth - 100 - 4 - 4 - 10) * aZoom),
			screenY : baseY + ((-content.scrollY + 5 + 5) * aZoom),
			left    : root.offsetWidth - 100 - 4 - 4 - 10 - content.scrollX,
			top     : 10 - content.scrollY,
			right   : root.offsetWidth - 100 - 4 - 4 - 10 - content.scrollX + 100 + 4 + 4,
			bottom  : 10 - content.scrollY + 100 + 4 + 4
		},
		$('positionedBoxAbsolute')
	);

	assertBoxObject(
		{
			element : $('positionedBoxFixed'),
			x       : 40 + 5,
			y       : 30 + 5,
			width   : 100 + 5 + 5,
			height  : 100 + 5 + 5,
			screenX : baseX + (40 * aZoom),
			screenY : baseY + (30 * aZoom),
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

function test_getBoxObjectFromClientRectFor()
{
	assertBoxObjectFromClientRect(1);
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
	markupDocumentViewer.fullZoom = 2;
}
test_getBoxObjectFromSomethingFor_withZoom.tearDown = function()
{
	markupDocumentViewer.fullZoom = 1;
	markupDocumentViewer = null;
}
function test_getBoxObjectFromSomethingFor_withZoom()
{
	assertBoxObjectFromClientRect(2);
}
