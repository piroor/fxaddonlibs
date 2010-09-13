/*
 Persistent Attributes Manager for Firefox 3.6 or later

 Usage:
   // for <elem width="..." persist="width"/>
   var width = window['piro.sakura.ne.jp'].persistAttr
                                          .getPersistentAttribute(elem, 'width');
   window['piro.sakura.ne.jp'].persistAttr
                              .removePersistentAttribute(elem, 'width');

 license: The MIT License, Copyright (c) 2010 SHIMODA "Piro" Hiroshi
   http://www.cozmixng.org/repos/piro/fx3-compatibility-lib/trunk/license.txt
 original:
   http://www.cozmixng.org/repos/piro/fx3-compatibility-lib/trunk/persistAttr.js
*/

/* To work as a JS Code Module */
if (typeof window == 'undefined' ||
	(window && typeof window.constructor == 'function')) {
	this.EXPORTED_SYMBOLS = ['persistAttr'];

	// If namespace.jsm is available, export symbols to the shared namespace.
	// See: http://www.cozmixng.org/repos/piro/fx3-compatibility-lib/trunk/namespace.jsm
	try {
		let ns = {};
		Components.utils.import('resource://my-modules/namespace.jsm', ns);
		/* var */ window = ns.getNamespaceFor('piro.sakura.ne.jp');
	}
	catch(e) {
		window = {};
	}
}

(function() {
	const currentRevision = 1;

	if (!('piro.sakura.ne.jp' in window)) window['piro.sakura.ne.jp'] = {};

	var loadedRevision = 'persistAttr' in window['piro.sakura.ne.jp'] ?
			window['piro.sakura.ne.jp'].persistAttr.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		return;
	}

	var Cc = Components.classes;
	var Ci = Components.interfaces;

	window['piro.sakura.ne.jp'].persistAttr = {
		revision : currentRevision,

		getPersistentAttribute : function(aElement, aAttr)
		{
			try {
				return this.localstore.GetTarget(
							this._getResourceForElement(aElement),
							this._RDF.GetResource(aAttr),
							true
						)
						.QueryInterface(Ci.nsIRDFLiteral)
						.Value;
			}
			catch(e) {
			}
			return null;
		},

		removePersistentAttribute : function(aElement, aAttr)
		{
			try {
				var elem = this._getResourceForElement(aElement);
				var attr = this._RDF.GetResource(aAttr);
				var old = this.localstore.GetTarget(elem, attr, true);
				this.localstore.Unassert(elem, attr, old);
			}
			catch(e) {
			}
		},

		export : function(aNamespace)
		{
			if (!aNamespace)
				return;

			var self = this;
			'getPersistentAttribute,removePersistentAttribute'
				.split(',')
				.forEach(function(aSymbol) {
					aNamespace[aSymbol] = function() {
						return self[aSymbol].apply(self, arguments);
					};
				});
		},

		_getResourceForElement : function(aElement)
		{
			var id = aElement.ownerDocument.defaultView.location.href +'#' + aElement.getAttribute('id');
			return this._RDF.GetResource(id);
		},

		_RDF : Cc['@mozilla.org/rdf/rdf-service;1']
					.getService(Ci.nsIRDFService),

		get localstore()
		{
			delete this.localstore;
			var localstore = Cc['@mozilla.org/file/directory_service;1']
								.getService(Ci.nsIProperties)
								.get('LclSt', Ci.nsIFile);
			localstore = Cc['@mozilla.org/network/io-service;1']
							.getService(Ci.nsIIOService)
							.newFileURI(localstore)
							.spec;
			return this.localstore = this._RDF.GetDataSource(localstore);
		},
	};
})();

if (window != this) { // work as a JS Code Module
	this.persistAttr = window['piro.sakura.ne.jp'].persistAttr;
}
