/*
 UI Operations History Manager

 Usage:
   var OH = window['piro.sakura.ne.jp'].operationHistory;

   // window specific history
   OH.doOperation(
     // the task which is undo-able (optional)
     function() {
       MyService.myProp = newValue;
     },

     // name of history (optional)
     'MyAddonFeature',

     // target window for the history (optional)
     window,

     // history item
     { label  : 'Change tabbar position',
       onUndo : function() { MyService.myProp = oldValue; },
       // "onRedo" is optional. If you don't specify it,
       // the undoable task becomes onRedo automatically.
       onRedo : function() { MyService.myProp = newValue; } }
   );
   OH.undo('MyAddonFeature', window);
   OH.redo('MyAddonFeature', window);

   // global history (not associated to window)
   OH.doOperation(
     function() { ... }, // task
     'MyAddonFeature',
     { ... }
   );
   OH.undo('MyAddonFeature');

   // anonymous, window specific
   OH.doOperation(function() { ... }, { ... }, window);
   OH.undo(window);

   // anonymous, global
   OH.doOperation(function() { ... }, { ... });
   OH.undo();

   // When you want to use "window" object in the global history,
   // you should use the ID string instead of the "window" object
   // to reduce memory leak. For example...
   OH.doOperation(
     function() {
       targetWindow.MyAddonService.myProp = newValue;
     },
     {
       id : OH.getWindowId(targetWindow),
       onUndo : function() {
         var w = OH.getWindowById(this.id);
         w.MyAddonService.myProp = oldValue;
       }
     }
   );

   // enumerate history entries
   var history = OH.getHistory('MyAddonFeature', window); // options are same to undo/redo
   OH.entries.forEach(function(aEntry, aIndex) {
     var item = MyService.appendItem(aEntry.label);
     if (aIndex == history.index)
       item.setAttribute('checked', true);
   });

 lisence: The MIT License, Copyright (c) 2009-2010 SHIMODA "Piro" Hiroshi
   http://www.cozmixng.org/repos/piro/fx3-compatibility-lib/trunk/license.txt
 original:
   http://www.cozmixng.org/repos/piro/fx3-compatibility-lib/trunk/operationHistory.js
   http://www.cozmixng.org/repos/piro/fx3-compatibility-lib/trunk/operationHistory.test.js
*/
(function() {
	const currentRevision = 52;

	if (!('piro.sakura.ne.jp' in window)) window['piro.sakura.ne.jp'] = {};

	var loadedRevision = 'operationHistory' in window['piro.sakura.ne.jp'] ?
			window['piro.sakura.ne.jp'].operationHistory.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		return;
	}

	var db;
	if (loadedRevision) {
		db = window['piro.sakura.ne.jp'].operationHistory._db ||
				window['piro.sakura.ne.jp'].operationHistory._tables; // old name
		if (!('histories' in db))
			db = { histories : db };
		window['piro.sakura.ne.jp'].operationHistory.destroy();
	}
	else {
		db = { histories : {} };
	}

	const Cc = Components.classes;
	const Ci = Components.interfaces;

	const PREF_PREFIX = 'extensions.UIOperationsHistoryManager@piro.sakura.ne.jp.';

	const Application = Cc['@mozilla.org/fuel/application;1']
					.getService(Ci.fuelIApplication);
	const Prefs = Cc['@mozilla.org/preferences;1']
					.getService(Ci.nsIPrefBranch);
	const WindowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
					.getService(Ci.nsIWindowMediator);
	const SessionStore = Cc['@mozilla.org/browser/sessionstore;1']
					.getService(Ci.nsISessionStore);

	var DEBUG = false;
	try {
		DEBUG = Prefs.getBoolPref(PREF_PREFIX+'debug');
	}
	catch(e) {
	}

	const oneIndent = '   ';
	function log(aString, aLevel) {
		if (!DEBUG) return;
		aString = String(aString);
		if (aLevel) {
			let indent = '';
			for (let i = 0; i < aLevel; i++)
			{
				indent += oneIndent;
			}
			aString = aString.replace(/^/gm, indent);
		}
		Application
			.console
			.log(aString);
	}

	window['piro.sakura.ne.jp'].operationHistory = {
		revision : currentRevision,

		WINDOW_ID : 'ui-operation-history-window-id',
		ELEMENT_ID : 'ui-operation-history-element-id',

		addEntry : function()
		{
			this.doOperation.apply(this, arguments);
		},

		// old name, for backward compatibility
		doUndoableTask : function()
		{
			this.doOperation.apply(this, arguments);
		},

		doOperation : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			var history = options.history;
			var entry = options.entry;
			log('doOperation start '+options.name+' ('+options.windowId+')'+
				'\n  '+entry.label,
				history.inOperationCount);

			var registered = false;
			if (
				entry &&
				!this._getUndoingState(options.key) &&
				!this._getRedoingState(options.key)
				) {
				history.addEntry(entry);
				registered = true;
			}

			var error;
			var canceled;
			var done = { done : true };
			if (options.task) {
				history.inOperation = true;

				var self = this;
				var iterator = (function() {
						try {
							canceled = options.task.call(
								this,
								{
									level   : history.inOperationCount-1,
									manager : self,
									window  : window,
									wait    : function() {
										done.done = false;
										return function() {
												done.done = true;
											};
									},
									continue : function() {
										done.done = true;
									}
								}
							);
						}
						catch(e) {
							log(e, history.inOperationCount);
							error = e;
						}
						while (!done.done)
						{
							yield true;
						}
					})();

				var onFinish = function() {
						if (registered && canceled === false) {
							history.removeEntry(entry);
							log('  => doOperation canceled : '+history.inOperation+'\n'+
								((history.inOperationCount ? entry.label : history.toString())
									.replace(/^/gm, '    ')),
								history.inOperationCount);
						}
						history.inOperation = false;
						log('  => doOperation done / '+history.inOperation+'\n'+
							((history.inOperationCount ? entry.label : history.toString())
								.replace(/^/gm, '    ')),
							history.inOperationCount);
					};

				try {
					done.done = !iterator.next();
					new ScheduledTask(function() {
							try {
								iterator.next();
							}
							catch(e if e instanceof StopIteration) {
								onFinish();
								return false;
							}
							catch(e) {
								return false;
							}
							finally {
								if (error)
									throw error;
							}
						}, 10);
				}
				catch(e if e instanceof StopIteration) {
					onFinish();
				}
			}

			if (error)
				throw error;

			return done;
		},

		getHistory : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			return new UIHistoryProxy(options.history);
		},

		undo : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			var history = options.history;
			var undoing = this._getUndoingState(options.key);
			log('undo start ('+history.index+' / '+history.entries.length+', '+options.name+' for '+options.windowId+', '+undoing+')');
			if (!history.canUndo || undoing)
				return { done : true };

			this._setUndoingState(options.key, true);
			var processed = false;
			var error;

			var self = this;
			var iterator = (function() {
					var shouldStop = false;
					do {
						let entries = history.currentEntries;
						--history.index;

						if (!entries.length) continue;
						shouldStop = true;

						log((history.index+1)+' '+entries[0].label, 1);
						let max = entries.length-1;
						entries = Array.slice(entries).reverse();
						for (let i in entries)
						{
							let entry = entries[i];
							log('level '+(max-i)+' '+entry.label, 2);
							let done = true;
							let f = self._getAvailableFunction(entry.onUndo, entry.onundo, entry.undo);
							let info = {
									level   : max-i,
									manager : self,
									window  : window,
									wait    : function() {
										done = false;
										return function() {
												done.done = true;
											};
									},
									continue : function() {
										done = true;
									},
									skip : function() {
										shouldStop = false;
									}
								};
							if (f) {
								try {
									if (f.call(entry, info) === false) {
										shouldStop = true;
										break;
									}
								}
								catch(e) {
									log(e, 2);
									error = e;
									shouldStop = true;
									break;
								}
							}
							try {
								if (!self._dispatchEvent('UIOperationHistoryUndo:'+options.name, entry, info)) {
									shouldStop = true;
									break;
								}
							}
							catch(e) {
								log(e, 2);
								error = e;
								shouldStop = true;
								break;
							}
							while (!done)
							{
								yield true;
							}
						}
					}
					while (!shouldStop && history.canUndo);
				})();

			var onFinish = function() {
					self._setUndoingState(options.key, false);
					log('  => undo done\n'+history.toString());
				};

			var done = { done : true };
			try {
				done.done = !iterator.next();
				new ScheduledTask(function() {
						try {
							iterator.next();
						}
						catch(e if e instanceof StopIteration) {
							done.done = true;
							onFinish();
							return false;
						}
						catch(e) {
							return false;
						}
						finally {
							if (error)
								throw error;
						}
					}, 10);
			}
			catch(e if e instanceof StopIteration) {
				onFinish();
			}

			if (error)
				throw error;

			return done;
		},

		redo : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			var history = options.history;
			var max = history.entries.length;
			var redoing = this._getRedoingState(options.key);
			log('redo start ('+history.index+' / '+max+', '+options.name+' for '+options.windowId+', '+redoing+')');
			if (!history.canRedo || redoing)
				return { done : true };

			this._setRedoingState(options.key, true);
			var processed = false;
			var error;

			var self = this;
			var iterator = (function() {
					var shouldStop = false;
					while (!shouldStop && history.canRedo)
					{
						++history.index;
						let entries = history.currentEntries;

						if (!entries.length) continue;
						shouldStop = true;

						log((history.index)+' '+entries[0].label, 1);
						for (let i in entries)
						{
							let entry = entries[i];
							log('level '+(i)+' '+entry.label, 2);
							let done = true;
							let info = {
									level   : i,
									manager : self,
									window  : window,
									wait    : function() {
										done = false;
										return function() {
												done.done = true;
											};
									},
									continue : function() {
										done = true;
									},
									skip : function() {
										shouldStop = false;
									}
								};
							let f = self._getAvailableFunction(entry.onRedo, entry.onredo, entry.redo);
							if (f) {
								try {
									if (f.call(entry, info) === false) {
										shouldStop = true;
										break;
									}
								}
								catch(e) {
									log(e, 2);
									error = e;
									shouldStop = true;
									break;
								}
							}
							try {
								if (!self._dispatchEvent('UIOperationHistoryRedo:'+options.name, entry, info)) {
									shouldStop = true;
									break;
								}
							}
							catch(e) {
								log(e, 2);
								error = e;
								shouldStop = true;
								break;
							}
							while (!done)
							{
								yield true;
							}
						}
					}
				})();

			var onFinish = function() {
					self._setRedoingState(options.key, false);
					log('  => redo done\n'+history.toString());
				};

			var done = { done : true };
			try {
				done.done = !iterator.next();
				new ScheduledTask(function() {
						try {
							iterator.next();
						}
						catch(e if e instanceof StopIteration) {
							done.done = true;
							onFinish();
							return false;
						}
						catch(e) {
							return false;
						}
						finally {
							if (error)
								throw error;
						}
					}, 10);
			}
			catch(e if e instanceof StopIteration) {
				onFinish();
			}

			if (error)
				throw error;

			return done;
		},

		goToIndex : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			var history = options.history;
			var index = Math.max(0, Math.min(history.entries.length-1, options.index));
			var current = history.index;

			if (index == current)
				return { done : true };

			var self = this;
			var iterator = (function() {
					while (true)
					{
						let info;
						if (index < current) {
							if (history.index <= index)
								break;
							info = self.undo(options.name, options.window);
						}
						else {
							if (history.index >= index)
								break;
							info = self.redo(options.name, options.window);
						}

						while (!info.done)
						{
							yield true;
						}
					}
				})();

			var done = { done : true };
			try {
				done.done = !iterator.next();
				new ScheduledTask(function() {
						try {
							iterator.next();
						}
						catch(e if e instanceof StopIteration) {
							done.done = true;
							window.clearInterval(timer);
							return false;
						}
						catch(e) {
							return false;
						}
					}, 10);
			}
			catch(e) {
			}

			return done;
		},

		isUndoing : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			return this._getUndoingState(options.key);
		},
		isRedoing : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			return this._getRedoingState(options.key);
		},

		fakeUndo : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			if (!options.name)
				options.name = 'window';
			if (!options.entry)
				throw new Error('target entry must be specified!');
			if (!options.window || options.window.closed)
				throw new Error('windows must be specified!');

			var history = this.getHistory(options.name, options.window)._original;
			var message = 'fakeUndo for '+name+' ('+options.entry.label+')';
			if (history.currentEntries.indexOf(options.entry) > -1) {
				history.index--;
				log(message+'\n => done (current)\n'+history.toString(), 5);
				return;
			}
			if (history.getEntriesAt(history.index-1).indexOf(options.entry) > -1) {
				history.index -= 2;
				log(message+'\n => done\n'+history.toString(), 5);
				return;
			}
			log(message+'\n => canceled (target entry not found)', 4);
		},
		fakeRedo : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			if (!options.name)
				options.name = 'window';
			if (!options.entry)
				throw new Error('target entry must be specified!');
			if (!options.window || options.window.closed)
				throw new Error('windows must be specified!');

			var history = this.getHistory(options.name, options.window)._original;
			var message = 'fakeRedo for '+name+' ('+options.entry.label+')';
			if (history.currentEntries.indexOf(options.entry) > -1) {
				history.index++;
				log(message+'\n => done (current)\n'+history.toString(), 5);
				return;
			}
			if (history.getEntriesAt(history.index+1).indexOf(options.entry) > -1) {
				history.index += 2;
				log(message+'\n => done\n'+history.toString(), 5);
				return;
			}
			log(message+'\n => canceled (target entry not found)', 4);
		},

		clear : function()
		{
			var options = this._getHistoryOptionsFromArguments(arguments);
			return options.history.clear();
		},


		getWindowId : function(aWindow, aDefaultId)
		{
			var root = aWindow.document.documentElement;
			var id = root.getAttribute(this.WINDOW_ID) || aDefaultId;
			try {
				if (!id)
					id = SessionStore.getWindowValue(aWindow, this.WINDOW_ID);
			}
			catch(e) {
			}
			return this.setWindowId(aWindow, id);
		},

		setWindowId : function(aWindow, aDefaultId)
		{
			var id = aDefaultId;
			var root = aWindow.document.documentElement;

			// When the ID has been already used by other window,
			// we have to create new ID for this window.
			var windows = this._getWindowsById(id);
			var forceNewId = windows.length && (windows.length > 1 || windows[0] != aWindow);

			if (!id || forceNewId)
				id = 'window-'+Date.now()+parseInt(Math.random() * 65000);

			if (root.getAttribute(this.WINDOW_ID) != id) {
				root.setAttribute(this.WINDOW_ID, id);
				try {
					SessionStore.setWindowValue(aWindow, this.WINDOW_ID, id);
				}
				catch(e) {
				}
			}
			return id;
		},

		getWindowById : function(aId)
		{
			var targets = WindowMediator.getZOrderDOMWindowEnumerator(null, true);
			while (targets.hasMoreElements())
			{
				let target = targets.getNext().QueryInterface(Ci.nsIDOMWindowInternal);
				if (aId == this.getWindowId(target))
					return target;
			}
			return null;
		},

		getElementId : function(aElement, aDefaultId)
		{
			var id = aElement.getAttribute(this.ELEMENT_ID) || aDefaultId;
			try {
				if (!id && aElement.localName == 'tab')
					id = SessionStore.getTabValue(aElement, this.ELEMENT_ID);
			}
			catch(e) {
			}
			return this.setElementId(aElement, id);
		},

		setElementId : function(aElement, aDefaultId)
		{
			var id = aDefaultId;

			// When the ID has been already used by other elements,
			// we have to create new ID for this element.
			var elements = this._getElementsById(id, aElement.parentNode || aElement.ownerDocument);
			var forceNewId = elements.length && (elements.length > 1 || elements[0] != aElement);

			if (!id || forceNewId)
				id = 'element-'+Date.now()+parseInt(Math.random() * 65000);

			if (aElement.getAttribute(this.ELEMENT_ID) != id) {
				aElement.setAttribute(this.ELEMENT_ID, id);
				try {
					if (aElement.localName == 'tab')
						SessionStore.setTabValue(aElement, this.ELEMENT_ID, id);
				}
				catch(e) {
				}
			}
			return id;
		},

		setBindingParentId : function(aNode, aDefaultId) // => planned to be removed or updated...
		{
			var parent = aNode.ownerDocument.getBindingParent(aNode);
			return parent ? this.setElementId(parent, aDefaultId) : null ;
		},

		getWindowById : function(aId)
		{
			if (!aId)
				throw new Error('window id must be specified.');
			var targets = WindowMediator.getZOrderDOMWindowEnumerator(null, true);
			while (targets.hasMoreElements())
			{
				let target = targets.getNext().QueryInterface(Ci.nsIDOMWindowInternal);
				if (aId == this.getWindowId(target))
					return target;
			}
			return null;
		},

		getElementById : function()
		{
			var options = this._getElementOptionsFromArguments(arguments);
			if (!options.id)
				throw new Error('element id must be specified.');
			return this._evaluateXPath(
					'descendant::*[@'+this.ELEMENT_ID+'="'+options.id+'"][1]',
					options.parent,
					Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE
				).singleNodeValue;
		},

		getId : function(aTarget, aDefaultId)
		{
			if (aTarget instanceof Ci.nsIDOMWindow)
				return this.getWindowId(aTarget, aDefaultId);
			if (aTarget instanceof Ci.nsIDOMDocument)
				return this.getWindowId(aTarget.defaultView, aDefaultId);
			if (aTarget instanceof Ci.nsIDOMElement)
				return this.getElementId(aTarget, aDefaultId);
			throw new Error(aTarget+' is an unknown type item.');
		},

		getBindingParentId : function(aNode, aDefaultId) // => planned to be removed or updated...
		{
			var parent = aNode.ownerDocument.getBindingParent(aNode);
			return parent ? this.getId(parent, aDefaultId) : null ;
		},

		getTargetById : function()
		{
			var id;
			Array.slice(arguments).some(function(aArg) {
				if (typeof aArg == 'string')
					return id = aArg;
				return false;
			});
			if (!id)
				throw new Error('target id must be specified.');

			if (id.indexOf('window-') == 0)
				return this.getWindowById.apply(this, arguments);
			if (id.indexOf('element-') == 0)
				return this.getElementById.apply(this, arguments);

			throw new Error(id+' is an unknown type id.');
		},

		getTargetsByIds : function()
		{
			var ids = [];
			var otherArgs = [];
			Array.slice(arguments).forEach(function(aArg) {
				if (typeof aArg == 'string')
					ids.push(aArg);
				else if (
						typeof aArg == 'object' &&
						'length' in aArg &&
						'every' in aArg &&
						typeof aArg.every == 'function' &&
						aArg.every(function(aItem) {
							return typeof aItem == 'string';
						})
					)
					ids = ids.concat(aArg);
				else
					otherArgs.push(aArg);
			});
			if (!ids.length)
				throw new Error('target id must be specified.');

			return ids.map(function(aId) {
					return this.getTargetById.apply(this, [aId].concat(otherArgs));
				}, this);
		},

		getRelatedTargetsByIds : function(aIds, aRootParent) // => planned to be removed or updated...
		{
			var results = [];
			var lastParent = aRootParent;
			aIds.some(function(aId) {
				try {
					var lastResult;
					if (typeof aId != 'string') {
						lastReuslt = this.getTargetsByIds(aId, lastParent);
						lastParent = lastParent[0];
					}
					else {
						lastReuslt = this.getTargetById(aId, lastParent);
						lastParent = lastReuslt;
					}
					results.push(lastReuslt);
					return false;
				}
				catch(e) {
					return e;
				}
			}, this);
			return results;
		},


		/* PRIVATE METHODS */

		_db : db,

		initialized : false,

		init : function()
		{
			// inherit history table from existing window
			var targets = WindowMediator.getZOrderDOMWindowEnumerator(null, true);
			while (targets.hasMoreElements())
			{
				let target = targets.getNext().QueryInterface(Ci.nsIDOMWindowInternal);
				if (
					'piro.sakura.ne.jp' in target &&
					'operationHistory' in target['piro.sakura.ne.jp'] &&
					target['piro.sakura.ne.jp'].operationHistory.initialized
					) {
					this._db = target['piro.sakura.ne.jp'].operationHistory._db;
					break;
				}
			}

			window.addEventListener('unload', this, false);

			this._initDBAsObserver();

			this.initialized = true;
		},

		_initDBAsObserver : function()
		{
			if ('observerRegistered' in this._db)
				return;

			this._db.observerRegistered = true;
			this._db.observe = function(aSubject, aTopic, aData) {
				switch (aTopic)
				{
					case 'private-browsing':
						switch (aData)
						{
							case 'enter':
							case 'exit':
								for (let i in this.histories)
								{
									this.histories[i].clear();
								}
								this.histories = {};
								break;
						}
						break;
				}
			};
			Cc['@mozilla.org/observer-service;1']
				.getService(Ci.nsIObserverService)
				.addObserver(this._db, 'private-browsing', false);
		},

		destroy : function()
		{
			window.removeEventListener('unload', this, false);
		},

		_dispatchEvent : function(aType, aEntry, aInfo)
		{
			var d = aInfo.window ? aInfo.window.document : document ;
			var event = d.createEvent('Events');
			event.initEvent(aType, true, true);

			event.entry = aEntry;
			event.params = aInfo;
			event.paramaterss = aInfo;
			event.manager = this;

			event.wait     = aInfo.wait;
			event.continue = aInfo.continue;
			event.skip     = aInfo.skip;

			var result = d.dispatchEvent(event);
			log('event dispacthed: '+aType+' ('+result+')', 3);
			return result;
		},

		_evaluateXPath : function(aExpression, aContext, aType) 
		{
			try {
				var doc = aContext.ownerDocument || aContext;
				var xpathResult = doc.evaluate(
						aExpression,
						aContext,
						null,
						aType,
						null
					);
			}
			catch(e) {
				return {
					singleNodeValue : null,
					snapshotLength  : 0,
					snapshotItem    : function() {
						return null
					}
				};
			}
			return xpathResult;
		},

		_getHistoryOptionsFromArguments : function(aArguments)
		{
			var w     = null,
				name  = '',
				entry = null,
				task  = null,
				index = -1;
			Array.slice(aArguments).some(function(aArg) {
				if (aArg instanceof Ci.nsIDOMWindow)
					w = aArg;
				else if (typeof aArg == 'string')
					name = aArg;
				else if (typeof aArg == 'number')
					index = aArg;
				else if (typeof aArg == 'function')
					task = aArg;
				else if (aArg)
					entry = aArg;
			});

			var type = w ? 'window' : 'global' ;
			if (!name)
				name = type;

			var windowId = w ? this.getWindowId(w) : null ;
			var history = this._getHistoryFor(name, w);

			return {
				name     : name,
				window   : w,
				windowId : windowId,
				key      : encodeURIComponent(name)+'::'+type,
				entry    : entry,
				history  : history,
				task     : task,
				index    : index
			};
		},

		_getElementOptionsFromArguments : function(aArguments)
		{
			var id       = '',
				document = null,
				parent   = null;
			Array.slice(aArguments).forEach(function(aArg) {
				if (typeof aArg == 'string')
					id = aArg;
				else if (aArg instanceof Ci.nsIDOMDocument)
					document = aArg;
				else if (aArg instanceof Ci.nsIDOMWindow)
					document = aArg.document;
				else if (aArg instanceof Ci.nsIDOMNode)
					parent = aArg;
			});

			if (!document) {
				if (parent)
					document = parent.ownerDocument;
				else
					document = window.document;
			}

			if (!parent)
				parent = document;

			return {
				id       : id,
				parent   : parent,
				document : document
			};
		},

		_getHistoryFor : function(aName, aWindow)
		{
			var uniqueName = encodeURIComponent(aName);

			var windowId = aWindow ? this.getWindowId(aWindow) : null ;
			if (windowId)
				uniqueName += '::'+windowId;

			if (!(uniqueName in this._db.histories)) {
				this._db.histories[uniqueName] = new UIHistory(aName, aWindow, windowId);
			}

			return this._db.histories[uniqueName];
		},

		_getAvailableFunction : function()
		{
			var functions = Array.slice(arguments);
			for each (var f in functions)
			{
				if (f && typeof f == 'function')
					return f;
			}
			return null;
		},

		_deleteWindowHistories : function(aWindow)
		{
			var w = aWindow || window;
			if (!w) return;

			var removedTables = [];
			for (let i in this._db.histories)
			{
				if (w == this._db.histories[i].window)
					removedTables.push(i);
			}
			removedTables.forEach(function(aName) {
				var table = this._db.histories[aName];
				delete table.entries;
				delete table.window;
				delete table.windowId;
				delete this._db.histories[aName];
			}, this);
		},

		_getWindowsById : function(aId)
		{
			var targets = WindowMediator.getZOrderDOMWindowEnumerator(null, true);
			var windows = [];
			while (targets.hasMoreElements())
			{
				let target = targets.getNext().QueryInterface(Ci.nsIDOMWindowInternal);
				let id = target.document.documentElement.getAttribute(this.WINDOW_ID);
				try {
					if (!id)
						id = SessionStore.getWindowValue(target, this.WINDOW_ID)
				}
				catch(e) {
				}
				if (id == aId)
					windows.push(target);
			}
			return windows;
		},

		_getElementsById : function(aId, aParent)
		{
			var result = this._evaluateXPath(
					'descendant::*[@'+this.ELEMENT_ID+'="'+aId+'"][1]',
					aParent,
					Ci.nsIDOMXPathResult.ORDERED_NODE_SNAPSHOT_TYPE
				);
			var elements = [];
			for (let i = 0, maxi = result.snapshotLength; i < maxi; i++)
			{
				elements.push(result.snapshotItem(i));
			}
			return elements;
		},

		_getUndoingState : function(aKey)
		{
			return this._db.undoing ? aKey in this._db.undoing : false ;
		},
		_getRedoingState : function(aKey)
		{
			return this._db.redoing ? aKey in this._db.redoing : false ;
		},

		_setUndoingState : function(aKey, aState)
		{
			if (!('undoing' in this._db))
				this._db.undoing = {};

			if (aState)
				this._db.undoing[aKey] = true;
			else if (aKey in this._db.undoing)
				delete this._db.undoing[aKey];
		},
		_setRedoingState : function(aKey, aState)
		{
			if (!('redoing' in this._db))
				this._db.redoing = {};

			if (aState)
				this._db.redoing[aKey] = true;
			else if (aKey in this._db.redoing)
				delete this._db.redoing[aKey];
		},

		handleEvent : function(aEvent)
		{
			switch (aEvent.type)
			{
				case 'unload':
					this._deleteWindowHistories(window);
					this.destroy();
					return;
			}
		}

	};

	function UIHistory(aName, aWindow, aId)
	{
		this.name     = aName;
		this.window   = aWindow;
		this.windowId = aId;

		this.key = aName+(aId ? ' ('+aId+')' : '' )

		try {
			var max = Prefs.getIntPref(this.maxPref);
			this._max = Math.max(0, Math.min(this.MAX_ENTRIES, max));
		}
		catch(e) {
			this._max = this.MAX_ENTRIES;
		}

		this.clear();
	}
	UIHistory.prototype = {

		MAX_ENTRIES : 999,
		get maxPref()
		{
			return PREF_PREFIX+escape(this.name)+'.max.'+(this.window ? 'window' : 'global');
		},
		get max()
		{
			return this._max;
		},
		set max(aValue)
		{
			var max = parseInt(aValue);
			if (!isNaN(max)) {
				max = Math.max(0, Math.min(this.MAX_ENTRIES, max));
				try {
					if (max != this._max)
						Prefs.setIntPref(this.maxPref, max);
				}
				catch(e) {
				}
				this._max = max;
			}
			return aValue;
		},

		get index()
		{
			return this._index;
		},
		set index(aValue)
		{
			this._index = Math.max(-1, Math.min(this.entries.length, aValue));
			return this._index;
		},

		get safeIndex()
		{
			return Math.max(0, Math.min(this.entries.length-1, this.index));
		},

		get inOperation()
		{
			return this.inOperationCount > 0;
		},
		set inOperation(aValue)
		{
			if (aValue)
				this.inOperationCount++;
			else if (this.inOperationCount)
				this.inOperationCount--;

			return this.inOperationCount > 0;
		},

		clear : function()
		{
			log('UIHistory::clear '+this.key);
			this.entries  = [];
			this.metaData = [];
			this._index   = -1;
			this.inOperationCount = 0;
		},

		addEntry : function(aEntry)
		{
			log('UIHistory::addEntry '+this.key+
				'\n  '+aEntry.label+
				'\n  '+this.inOperationCount,
				this.inOperationCount);
			if (this.inOperation) {
				let metaData = this.lastMetaData;
				metaData.children.push(aEntry);
				metaData.names.push(aEntry.name);
				log(' => level '+metaData.children.length+' (child)', this.inOperationCount);
			}
			else {
				this._addNewEntry(aEntry);
				log(' => level 0 (new entry at '+(this.entries.length-1)+')', this.inOperationCount);
			}
		},
		_addNewEntry : function(aEntry)
		{
			this.entries = this.entries.slice(0, this.index+1);
			this.entries.push(aEntry);
			this.entries = this.entries.slice(-this.max);

			var metaData = new UIHistoryMetaData();
			metaData.names.push(aEntry.name);

			this.metaData = this.metaData.slice(0, this.index+1);
			this.metaData.push(metaData);
			this.metaData = this.metaData.slice(-this.max);

			this.index = this.entries.length;
		},

		removeEntry : function(aEntry)
		{
			for (let i = this.safeIndex; i > -1; i--)
			{
				let index = this.getEntriesAt(i).indexOf(aEntry);
				if (index < 0) continue;

				if (index == 0) {
					this.entries.splice(index, 1);
					this.metaData.splice(index, 1);
					this.index--;
				}
				else {
					this.metaData[i].children.splice(index-1, 1);
				}
				break;
			}
		},

		get canUndo()
		{
			return this.index >= 0;
		},
		get canRedo()
		{
			return this.index < this.entries.length;
		},

		get currentEntry()
		{
			return this.entries[this.index] || null ;
		},
		get lastEntry()
		{
			return this.entries[this.entries.length-1];
		},

		get currentMetaData()
		{
			return this.metaData[this.index] || null ;
		},
		get lastMetaData()
		{
			return this.metaData[this.metaData.length-1];
		},

		getEntriesAt : function(aIndex)
		{
			let entry = this.entries[aIndex];
			if (!entry) return [];
			let metaData = this.metaData[aIndex];
			return [entry].concat(metaData.children);
		},
		get currentEntries()
		{
			return this.getEntriesAt(this.index);
		},
		get lastEntries()
		{
			return this.getEntriesAt(this.entries.length-1);
		},

		_getPromotionOptions : function(aArguments)
		{
			var entry, names = [];
			Array.slice(aArguments).forEach(function(aArg) {
				if (typeof aArg == 'string')
					names.push(aArg);
				else if (typeof aArg == 'object')
					entry = aArg;
			});
			return [entry, names];
		},

		toString : function()
		{
			try {
				var entries = this.entries || [];
				var metaData = this.metaData;
				var index = this.index;
				var string = entries
								.map(function(aEntry, aIndex) {
									var children = metaData[aIndex].children.length;
									children = children ? ' ('+children+')' : '' ;
									var name = aEntry.name;
									name = name ? ' ['+name+']' : '' ;
									return (aIndex == index ? '*' : ' ' )+
											' '+aIndex+': '+aEntry.label+
											name+
											children;
								}, this)
								.join('\n');
				if (index < 0)
					string = '* -1: -----\n' + string;
				else if (index >= entries.length)
					string += '\n* '+entries.length+': -----';

				return this.key+'\n'+string;
			}
			catch(e) {
				return this.key+'\n'+e;
			}
		}
	};

	function UIHistoryProxy(aHistory)
	{
		this._original = aHistory;
	}
	UIHistoryProxy.prototype = {
		__proto__ : UIHistory.prototype,

		get key() { return this._original.key; },
		get name() { return this._original.name; },
		get window() { return this._original.window; },
		get windowId() { return this._original.windowId; },

		get index() { return this._original.safeIndex; },
		set index(aValue) { return this._original.index = aValue; },

		get entries() { return this._original.entries; },
		set entries(aValue) { return this._original.entries = aValue; },

		get metaData() { return this._original.metaData; },
		set metaData(aValue) { return this._original.metaData = aValue; },

		get inOperationCount() { return this._original.inOperationCount; },
		set inOperationCount(aValue) { return this._original.inOperationCount = aValue; },

		clear : function() { return this._original.clear(); },
		toString : function() { return this._original.toString(); }
	};

	function UIHistoryMetaData()
	{
		this.clear();
	}
	UIHistoryMetaData.prototype = {
		clear : function()
		{
			this.children = [];
			this.names    = [];
			this.insertionTargets = {};
		},

		registerInsertionTarget : function(aEntry, aNames)
		{
			aNames.forEach(function(aName) {
				if (!this.insertionTargets[aName])
					this.insertionTargets[aName] = [];
				this.insertionTargets[aName].push(aEntry);
			}, this);
		}
	};

	function ScheduledTask(aTask, aInterval) 
	{
		this.task = aTask;
		this.init(aInterval);
	}
	ScheduledTask.prototype = {
		init : function(aInterval)
		{
			this.timer = Cc['@mozilla.org/timer;1']
							.createInstance(Ci.nsITimer);
			this.timer.init(this, aInterval, Ci.nsITimer.TYPE_REPEATING_SLACK);
		},
		cancel : function()
		{
			try {
				this.timer.cancel();
			}
			catch(e) {
			}
			delete this.timer;
			delete this.task;
		},
		observe : function(aSubject, aTopic, aData)
		{
			if (aTopic != 'timer-callback') return;
			try {
				if (this.task() === false)
					this.cancel();
			}
			catch(e) {
				this.cancel();
			}
		}
	};

	// export
	window['piro.sakura.ne.jp'].operationHistory.UIHistory         = UIHistory;
	window['piro.sakura.ne.jp'].operationHistory.UIHistoryProxy    = UIHistoryProxy;
	window['piro.sakura.ne.jp'].operationHistory.UIHistoryMetaData = UIHistoryMetaData;
	window['piro.sakura.ne.jp'].operationHistory.ScheduledTask     = ScheduledTask;

	window['piro.sakura.ne.jp'].operationHistory.init();
})();
