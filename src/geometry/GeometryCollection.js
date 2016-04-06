/**
 * @classdesc
 * Represents a GeometryCollection.
 * @class
 * @category geometry
 * @extends maptalks.Geometry
 * @param {maptalks.Geometry[]} geometries - GeometryCollection's geometries
 */
Z.GeometryCollection = Z.Geometry.extend(/** @lends maptalks.GeometryCollection.prototype */{
    type:Z.Geometry['TYPE_GEOMETRYCOLLECTION'],

    exceptionDefs:{
        'en-US':{
            'INVALID_GEOMETRY':'invalid geometry for collection.'
        },
        'zh-CN':{
            'INVALID_GEOMETRY':'无效的Geometry被加入到collection中.'
        }
    },

    initialize:function(geometries, opts) {
        this._initOptions(opts);
        this.setGeometries(geometries);
    },

    /**
     * Set new geometries to the geometry collection
     * @param {maptalks.Geometry[]} geometries
     * @return {maptalks.GeometryCollection} this
     */
    setGeometries:function(_geometries) {
        var geometries = this._checkGeometries(_geometries);
        //Set the collection as child geometries' parent.
        if (Z.Util.isArray(geometries)) {
            for (var i = geometries.length - 1; i >= 0; i--) {
                geometries[i]._initOptions(this.config());
                geometries[i]._setParent(this);
                geometries[i].setEventParent(this);
                geometries[i].setSymbol(this.getSymbol());
            }
        }
        this._geometries = geometries;
        if (this.getLayer()) {
            this._bindGeometriesToLayer();
            this._onShapeChanged();
        }
        return this;
    },

    /**
     * Get geometries of the geometry collection
     * @return {maptalks.Geometry[]}
     */
    getGeometries:function() {
        if (!this._geometries) {
            return [];
        }
        return this._geometries;
    },

    /**
     * Translate or move the geometry collection by the given offset.
     * @param  {maptalks.Coordinate} offset - translate offset
     * @return {maptalks.GeometryCollection} this
     */
    translate:function(offset) {
        if (!offset) {
            return this;
        }
        if (this.isEmpty()) {
            return this;
        }
        for (var i=0, len=this._geometries.length;i<len;i++) {
            if (this._geometries[i] && this._geometries[i].translate) {
                this._geometries[i].translate(offset);
            }
        }
        return this;
    },

    /**
     * Whether the geometry collection is empty
     * @return {Boolean}
     */
    isEmpty:function() {
        return !Z.Util.isArrayHasData(this.getGeometries());
    },

    /**
     * remove itself from the layer if any.
     * @returns {maptalks.Geometry} this
     * @fires maptalks.Geometry#removestart
     * @fires maptalks.Geometry#remove
     */
    remove:function() {
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            this._geometries[i]._rootRemove();
        }
        this._rootRemoveAndFireEvent();
    },

    /**
     * Show the geometry collection.
     * @return {maptalks.GeometryCollection} this
     * @fires maptalks.Geometry#show
     */
    show:function() {
        this.options['visible'] = true;
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            this._geometries[i].show();
        }
        return this;
    },

    /**
     * Hide the geometry collection.
     * @return {maptalks.GeometryCollection} this
     * @fires maptalks.Geometry#hide
     */
    hide:function() {
        this.options['visible'] = false;
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            this._geometries[i].hide();
        }
        return this;
    },

    setSymbol:function(symbol) {
        if (!symbol) {
           this._symbol = null;
        } else {
           var camelSymbol = this._prepareSymbol(symbol);
           this._symbol = camelSymbol;
        }
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            this._geometries[i].setSymbol(symbol);
        }
        this._onSymbolChanged();
        return this;
    },

    onConfig:function(config) {
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            this._geometries[i].config(config);
        }
    },

    /**
     * bind this geometry collection to a layer
     * @param  {maptalks.Layer} layer
     * @private
     */
    _bindLayer:function(layer) {
        this._commonBindLayer(layer);
        this._bindGeometriesToLayer();
    },

    _bindGeometriesToLayer:function() {
        var layer = this.getLayer();
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            this._geometries[i]._bindLayer(layer);
        }
    },

    /**
     * Check whether the type of geometries is valid
     * @param  {maptalks.Geometry[]} geometries - geometries to check
     * @private
     */
    _checkGeometries:function(geometries) {
        if (geometries && !Z.Util.isArray(geometries)) {
            if (geometries instanceof Z.Geometry) {
                return [geometries];
            } else {
                throw new Error(this.exceptions['INVALID_GEOMETRY']);
            }
        } else if (Z.Util.isArray(geometries)) {
            for (var i=0, len=geometries.length;i<len;i++) {
                if (!(geometries[i] instanceof Z.Geometry)) {
                   throw new Error(this.exceptions['INVALID_GEOMETRY']);
                }
            }
            return geometries;
        }
        return null;
    },

    _updateCache:function() {
        delete this._extent;
        if (this.isEmpty()) {
            return;
        }
        for (var i=0, len=this._geometries.length;i<len;i++) {
            if (this._geometries[i] && this._geometries[i]._updateCache) {
                this._geometries[i]._updateCache();
            }
        }
    },

    _removePainter:function() {
        if (this._painter) {
            this._painter.remove();
        }
        delete this._painter;
        for (var i=0, len=this._geometries.length;i<len;i++) {
            if (this._geometries[i]) {
                this._geometries[i]._removePainter();
            }
        }
    },

    _computeCenter:function(projection) {
        if (!projection || this.isEmpty()) {
            return null;
        }
        var sumX=0, sumY=0,counter=0;
        var geometries = this.getGeometries();
        for (var i=0, len=geometries.length;i<len;i++) {
            if (!geometries[i]) {
                continue;
            }
            var center = geometries[i]._computeCenter(projection);
            if (center) {
                sumX += center.x;
                sumY += center.y;
                counter++;
            }
        }
        if (counter === 0) {
            return null;
        }
        return new Z.Coordinate(sumX/counter, sumY/counter);
    },

    _containsPoint: function(point) {
        if (this.isEmpty()) {
            return false;
        }
        var i, len;
        var geometries = this.getGeometries();
        for (i = 0, len = geometries.length; i < len; i++) {
            if (geometries[i]._containsPoint(point)) {
                return true;
            }
        }

        return false;
    },

    _computeExtent:function(projection) {
        if (this.isEmpty()) {
            return null;
        }
        var geometries = this.getGeometries();
        var result = null;
        for (var i=0, len=geometries.length;i<len;i++) {
            if (!geometries[i]) {
                continue;
            }
            var geoExtent = geometries[i]._computeExtent(projection);
            if (geoExtent) {
                result = geoExtent.combine(result);
            }
        }
        return result;
    },



    _computeGeodesicLength:function(projection) {
        if (!projection || this.isEmpty()) {
            return 0;
        }
        var geometries = this.getGeometries();
        var result = 0;
        for (var i=0, len=geometries.length;i<len;i++) {
            if (!geometries[i]) {
                continue;
            }
            result += geometries[i]._computeGeodesicLength(projection);
        }
        return result;
    },

    _computeGeodesicArea:function(projection) {
        if (!projection || this.isEmpty()) {
            return 0;
        }
        var geometries = this.getGeometries();
        var result = 0;
        for (var i=0, len=geometries.length;i<len;i++) {
            if (!geometries[i]) {
                continue;
            }
            result += geometries[i]._computeGeodesicArea(projection);
        }
        return result;
    },


   _exportGeoJSONGeometry:function() {
        var geoJSON = [];
        if (!this.isEmpty()) {
            var geometries = this.getGeometries();
            for (var i=0,len=geometries.length;i<len;i++) {
                if (!geometries[i]) {
                    continue;
                }
                geoJSON.push(geometries[i]._exportGeoJSONGeometry());
            }
        }
        return {
            'type':         'GeometryCollection',
            'geometries':   geoJSON
        };
    },

    _clearProjection:function() {
        if (this.isEmpty()) {
            return;
        }
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            if (!geometries[i]) {
                continue;
            }
            geometries[i]._clearProjection();
        }

    },

    /**
     * Get connect points if being connected by [ConnectorLine]{@link maptalks.ConnectorLine}
     * @private
     * @return {maptalks.Coordinate[]}
     */
    _getConnectPoints: function() {
        var extent = this.getExtent();
        var anchors = [
            new Z.Coordinate(extent.xmin,extent.ymax),
            new Z.Coordinate(extent.xmax,extent.ymin),
            new Z.Coordinate(extent.xmin,extent.ymin),
            new Z.Coordinate(extent.xmax,extent.ymax)
        ];
        return anchors;
    },

//----------覆盖Geometry中的编辑相关方法-----------------


    startEdit:function(opts) {
        if (this.isEmpty()) {
            return this;
        }
        if (!opts) {
            opts = {};
        }
        if (opts['symbol']) {
            this._originalSymbol = this.getSymbol();
            this.setSymbol(opts['symbol']);
        }
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            geometries[i].startEdit(opts);
        }
        this._editing = true;
        this.hide();
        var me = this;
        setTimeout(function() {
            me.fire('editstart');
        }, 1);
        return this;
    },


    endEdit:function() {
        if (this.isEmpty()) {
            return this;
        }
        var geometries = this.getGeometries();
        for (var i=0,len=geometries.length;i<len;i++) {
            geometries[i].endEdit();
        }
        if (this._originalSymbol) {
            this.setSymbol(this._originalSymbol);
            delete this._originalSymbol;
        }
        this._editing = false;
        this.show();
        this.fire('editend');
        return this;
    },


    isEditing:function() {
        if (!this._editing) {
            return false;
        }
        return true;
    }
});
