var cdt2d = null;
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
cdt2d = require('cdt2d');
},{"cdt2d":3}],2:[function(require,module,exports){
"use strict"

// (a, y, c, l, h) = (array, y[, cmp, lo, hi])

function ge(a, y, c, l, h) {
  var i = h + 1;
  while (l <= h) {
    var m = (l + h) >>> 1, x = a[m];
    var p = (c !== undefined) ? c(x, y) : (x - y);
    if (p >= 0) { i = m; h = m - 1 } else { l = m + 1 }
  }
  return i;
};

function gt(a, y, c, l, h) {
  var i = h + 1;
  while (l <= h) {
    var m = (l + h) >>> 1, x = a[m];
    var p = (c !== undefined) ? c(x, y) : (x - y);
    if (p > 0) { i = m; h = m - 1 } else { l = m + 1 }
  }
  return i;
};

function lt(a, y, c, l, h) {
  var i = l - 1;
  while (l <= h) {
    var m = (l + h) >>> 1, x = a[m];
    var p = (c !== undefined) ? c(x, y) : (x - y);
    if (p < 0) { i = m; l = m + 1 } else { h = m - 1 }
  }
  return i;
};

function le(a, y, c, l, h) {
  var i = l - 1;
  while (l <= h) {
    var m = (l + h) >>> 1, x = a[m];
    var p = (c !== undefined) ? c(x, y) : (x - y);
    if (p <= 0) { i = m; l = m + 1 } else { h = m - 1 }
  }
  return i;
};

function eq(a, y, c, l, h) {
  while (l <= h) {
    var m = (l + h) >>> 1, x = a[m];
    var p = (c !== undefined) ? c(x, y) : (x - y);
    if (p === 0) { return m }
    if (p <= 0) { l = m + 1 } else { h = m - 1 }
  }
  return -1;
};

function norm(a, y, c, l, h, f) {
  if (typeof c === 'function') {
    return f(a, y, c, (l === undefined) ? 0 : l | 0, (h === undefined) ? a.length - 1 : h | 0);
  }
  return f(a, y, undefined, (c === undefined) ? 0 : c | 0, (l === undefined) ? a.length - 1 : l | 0);
}

module.exports = {
  ge: function(a, y, c, l, h) { return norm(a, y, c, l, h, ge)},
  gt: function(a, y, c, l, h) { return norm(a, y, c, l, h, gt)},
  lt: function(a, y, c, l, h) { return norm(a, y, c, l, h, lt)},
  le: function(a, y, c, l, h) { return norm(a, y, c, l, h, le)},
  eq: function(a, y, c, l, h) { return norm(a, y, c, l, h, eq)}
}

},{}],3:[function(require,module,exports){
'use strict'

var monotoneTriangulate = require('./lib/monotone')
var makeIndex = require('./lib/triangulation')
var delaunayFlip = require('./lib/delaunay')
var filterTriangulation = require('./lib/filter')

module.exports = cdt2d

function canonicalizeEdge(e) {
  return [Math.min(e[0], e[1]), Math.max(e[0], e[1])]
}

function compareEdge(a, b) {
  return a[0]-b[0] || a[1]-b[1]
}

function canonicalizeEdges(edges) {
  return edges.map(canonicalizeEdge).sort(compareEdge)
}

function getDefault(options, property, dflt) {
  if(property in options) {
    return options[property]
  }
  return dflt
}

function cdt2d(points, edges, options) {

  if(!Array.isArray(edges)) {
    options = edges || {}
    edges = []
  } else {
    options = options || {}
    edges = edges || []
  }

  //Parse out options
  var delaunay = !!getDefault(options, 'delaunay', true)
  var interior = !!getDefault(options, 'interior', true)
  var exterior = !!getDefault(options, 'exterior', true)
  var infinity = !!getDefault(options, 'infinity', false)

  //Handle trivial case
  if((!interior && !exterior) || points.length === 0) {
    return []
  }

  //Construct initial triangulation
  var cells = monotoneTriangulate(points, edges)

  //If delaunay refinement needed, then improve quality by edge flipping
  if(delaunay || interior !== exterior || infinity) {

    //Index all of the cells to support fast neighborhood queries
    var triangulation = makeIndex(points.length, canonicalizeEdges(edges))
    for(var i=0; i<cells.length; ++i) {
      var f = cells[i]
      triangulation.addTriangle(f[0], f[1], f[2])
    }

    //Run edge flipping
    if(delaunay) {
      delaunayFlip(points, triangulation)
    }

    //Filter points
    if(!exterior) {
      return filterTriangulation(triangulation, -1)
    } else if(!interior) {
      return filterTriangulation(triangulation,  1, infinity)
    } else if(infinity) {
      return filterTriangulation(triangulation, 0, infinity)
    } else {
      return triangulation.cells()
    }
    
  } else {
    return cells
  }
}

},{"./lib/delaunay":4,"./lib/filter":5,"./lib/monotone":6,"./lib/triangulation":7}],4:[function(require,module,exports){
'use strict'

var inCircle = require('robust-in-sphere')[4]
var bsearch = require('binary-search-bounds')

module.exports = delaunayRefine

function testFlip(points, triangulation, stack, a, b, x) {
  var y = triangulation.opposite(a, b)

  //Test boundary edge
  if(y < 0) {
    return
  }

  //Swap edge if order flipped
  if(b < a) {
    var tmp = a
    a = b
    b = tmp
    tmp = x
    x = y
    y = tmp
  }

  //Test if edge is constrained
  if(triangulation.isConstraint(a, b)) {
    return
  }

  //Test if edge is delaunay
  if(inCircle(points[a], points[b], points[x], points[y]) < 0) {
    stack.push(a, b)
  }
}

//Assume edges are sorted lexicographically
function delaunayRefine(points, triangulation) {
  var stack = []

  var numPoints = points.length
  var stars = triangulation.stars
  for(var a=0; a<numPoints; ++a) {
    var star = stars[a]
    for(var j=1; j<star.length; j+=2) {
      var b = star[j]

      //If order is not consistent, then skip edge
      if(b < a) {
        continue
      }

      //Check if edge is constrained
      if(triangulation.isConstraint(a, b)) {
        continue
      }

      //Find opposite edge
      var x = star[j-1], y = -1
      for(var k=1; k<star.length; k+=2) {
        if(star[k-1] === b) {
          y = star[k]
          break
        }
      }

      //If this is a boundary edge, don't flip it
      if(y < 0) {
        continue
      }

      //If edge is in circle, flip it
      if(inCircle(points[a], points[b], points[x], points[y]) < 0) {
        stack.push(a, b)
      }
    }
  }

  while(stack.length > 0) {
    var b = stack.pop()
    var a = stack.pop()

    //Find opposite pairs
    var x = -1, y = -1
    var star = stars[a]
    for(var i=1; i<star.length; i+=2) {
      var s = star[i-1]
      var t = star[i]
      if(s === b) {
        y = t
      } else if(t === b) {
        x = s
      }
    }

    //If x/y are both valid then skip edge
    if(x < 0 || y < 0) {
      continue
    }

    //If edge is now delaunay, then don't flip it
    if(inCircle(points[a], points[b], points[x], points[y]) >= 0) {
      continue
    }

    //Flip the edge
    triangulation.flip(a, b)

    //Test flipping neighboring edges
    testFlip(points, triangulation, stack, x, a, y)
    testFlip(points, triangulation, stack, a, y, x)
    testFlip(points, triangulation, stack, y, b, x)
    testFlip(points, triangulation, stack, b, x, y)
  }
}

},{"binary-search-bounds":2,"robust-in-sphere":8}],5:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')

module.exports = classifyFaces

function FaceIndex(cells, neighbor, constraint, flags, active, next, boundary) {
  this.cells       = cells
  this.neighbor    = neighbor
  this.flags       = flags
  this.constraint  = constraint
  this.active      = active
  this.next        = next
  this.boundary    = boundary
}

var proto = FaceIndex.prototype

function compareCell(a, b) {
  return a[0] - b[0] ||
         a[1] - b[1] ||
         a[2] - b[2]
}

proto.locate = (function() {
  var key = [0,0,0]
  return function(a, b, c) {
    var x = a, y = b, z = c
    if(b < c) {
      if(b < a) {
        x = b
        y = c
        z = a
      }
    } else if(c < a) {
      x = c
      y = a
      z = b
    }
    if(x < 0) {
      return -1
    }
    key[0] = x
    key[1] = y
    key[2] = z
    return bsearch.eq(this.cells, key, compareCell)
  }
})()

function indexCells(triangulation, infinity) {
  //First get cells and canonicalize
  var cells = triangulation.cells()
  var nc = cells.length
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    var x = c[0], y = c[1], z = c[2]
    if(y < z) {
      if(y < x) {
        c[0] = y
        c[1] = z
        c[2] = x
      }
    } else if(z < x) {
      c[0] = z
      c[1] = x
      c[2] = y
    }
  }
  cells.sort(compareCell)

  //Initialize flag array
  var flags = new Array(nc)
  for(var i=0; i<flags.length; ++i) {
    flags[i] = 0
  }

  //Build neighbor index, initialize queues
  var active = []
  var next   = []
  var neighbor = new Array(3*nc)
  var constraint = new Array(3*nc)
  var boundary = null
  if(infinity) {
    boundary = []
  }
  var index = new FaceIndex(
    cells,
    neighbor,
    constraint,
    flags,
    active,
    next,
    boundary)
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    for(var j=0; j<3; ++j) {
      var x = c[j], y = c[(j+1)%3]
      var a = neighbor[3*i+j] = index.locate(y, x, triangulation.opposite(y, x))
      var b = constraint[3*i+j] = triangulation.isConstraint(x, y)
      if(a < 0) {
        if(b) {
          next.push(i)
        } else {
          active.push(i)
          flags[i] = 1
        }
        if(infinity) {
          boundary.push([y, x, -1])
        }
      }
    }
  }
  return index
}

function filterCells(cells, flags, target) {
  var ptr = 0
  for(var i=0; i<cells.length; ++i) {
    if(flags[i] === target) {
      cells[ptr++] = cells[i]
    }
  }
  cells.length = ptr
  return cells
}

function classifyFaces(triangulation, target, infinity) {
  var index = indexCells(triangulation, infinity)

  if(target === 0) {
    if(infinity) {
      return index.cells.concat(index.boundary)
    } else {
      return index.cells
    }
  }

  var side = 1
  var active = index.active
  var next = index.next
  var flags = index.flags
  var cells = index.cells
  var constraint = index.constraint
  var neighbor = index.neighbor

  while(active.length > 0 || next.length > 0) {
    while(active.length > 0) {
      var t = active.pop()
      if(flags[t] === -side) {
        continue
      }
      flags[t] = side
      var c = cells[t]
      for(var j=0; j<3; ++j) {
        var f = neighbor[3*t+j]
        if(f >= 0 && flags[f] === 0) {
          if(constraint[3*t+j]) {
            next.push(f)
          } else {
            active.push(f)
            flags[f] = side
          }
        }
      }
    }

    //Swap arrays and loop
    var tmp = next
    next = active
    active = tmp
    next.length = 0
    side = -side
  }

  var result = filterCells(cells, flags, target)
  if(infinity) {
    return result.concat(index.boundary)
  }
  return result
}

},{"binary-search-bounds":2}],6:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')
var orient = require('robust-orientation')[3]

var EVENT_POINT = 0
var EVENT_END   = 1
var EVENT_START = 2

module.exports = monotoneTriangulate

//A partial convex hull fragment, made of two unimonotone polygons
function PartialHull(a, b, idx, lowerIds, upperIds) {
  this.a = a
  this.b = b
  this.idx = idx
  this.lowerIds = lowerIds
  this.upperIds = upperIds
}

//An event in the sweep line procedure
function Event(a, b, type, idx) {
  this.a    = a
  this.b    = b
  this.type = type
  this.idx  = idx
}

//This is used to compare events for the sweep line procedure
// Points are:
//  1. sorted lexicographically
//  2. sorted by type  (point < end < start)
//  3. segments sorted by winding order
//  4. sorted by index
function compareEvent(a, b) {
  var d =
    (a.a[0] - b.a[0]) ||
    (a.a[1] - b.a[1]) ||
    (a.type - b.type)
  if(d) { return d }
  if(a.type !== EVENT_POINT) {
    d = orient(a.a, a.b, b.b)
    if(d) { return d }
  }
  return a.idx - b.idx
}

function testPoint(hull, p) {
  return orient(hull.a, hull.b, p)
}

function addPoint(cells, hulls, points, p, idx) {
  var lo = bsearch.lt(hulls, p, testPoint)
  var hi = bsearch.gt(hulls, p, testPoint)
  for(var i=lo; i<hi; ++i) {
    var hull = hulls[i]

    //Insert p into lower hull
    var lowerIds = hull.lowerIds
    var m = lowerIds.length
    while(m > 1 && orient(
        points[lowerIds[m-2]],
        points[lowerIds[m-1]],
        p) > 0) {
      cells.push(
        [lowerIds[m-1],
         lowerIds[m-2],
         idx])
      m -= 1
    }
    lowerIds.length = m
    lowerIds.push(idx)

    //Insert p into upper hull
    var upperIds = hull.upperIds
    var m = upperIds.length
    while(m > 1 && orient(
        points[upperIds[m-2]],
        points[upperIds[m-1]],
        p) < 0) {
      cells.push(
        [upperIds[m-2],
         upperIds[m-1],
         idx])
      m -= 1
    }
    upperIds.length = m
    upperIds.push(idx)
  }
}

function findSplit(hull, edge) {
  var d
  if(hull.a[0] < edge.a[0]) {
    d = orient(hull.a, hull.b, edge.a)
  } else {
    d = orient(edge.b, edge.a, hull.a)
  }
  if(d) { return d }
  if(edge.b[0] < hull.b[0]) {
    d = orient(hull.a, hull.b, edge.b)
  } else {
    d = orient(edge.b, edge.a, hull.b)
  }
  return d || hull.idx - edge.idx
}

function splitHulls(hulls, points, event) {
  var splitIdx = bsearch.le(hulls, event, findSplit)
  var hull = hulls[splitIdx]
  var upperIds = hull.upperIds
  var x = upperIds[upperIds.length-1]
  hull.upperIds = [x]
  hulls.splice(splitIdx+1, 0,
    new PartialHull(event.a, event.b, event.idx, [x], upperIds))
}


function mergeHulls(hulls, points, event) {
  //Swap pointers for merge search
  var tmp = event.a
  event.a = event.b
  event.b = tmp
  var mergeIdx = bsearch.eq(hulls, event, findSplit)
  var upper = hulls[mergeIdx]
  var lower = hulls[mergeIdx-1]
  lower.upperIds = upper.upperIds
  hulls.splice(mergeIdx, 1)
}


function monotoneTriangulate(points, edges) {

  var numPoints = points.length
  var numEdges = edges.length

  var events = []

  //Create point events
  for(var i=0; i<numPoints; ++i) {
    events.push(new Event(
      points[i],
      null,
      EVENT_POINT,
      i))
  }

  //Create edge events
  for(var i=0; i<numEdges; ++i) {
    var e = edges[i]
    var a = points[e[0]]
    var b = points[e[1]]
    if(a[0] < b[0]) {
      events.push(
        new Event(a, b, EVENT_START, i),
        new Event(b, a, EVENT_END, i))
    } else if(a[0] > b[0]) {
      events.push(
        new Event(b, a, EVENT_START, i),
        new Event(a, b, EVENT_END, i))
    }
  }

  //Sort events
  events.sort(compareEvent)

  //Initialize hull
  var minX = events[0].a[0] - (1 + Math.abs(events[0].a[0])) * Math.pow(2, -52)
  var hull = [ new PartialHull([minX, 1], [minX, 0], -1, [], [], [], []) ]

  //Process events in order
  var cells = []
  for(var i=0, numEvents=events.length; i<numEvents; ++i) {
    var event = events[i]
    var type = event.type
    if(type === EVENT_POINT) {
      addPoint(cells, hull, points, event.a, event.idx)
    } else if(type === EVENT_START) {
      splitHulls(hull, points, event)
    } else {
      mergeHulls(hull, points, event)
    }
  }

  //Return triangulation
  return cells
}

},{"binary-search-bounds":2,"robust-orientation":9}],7:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')

module.exports = createTriangulation

function Triangulation(stars, edges) {
  this.stars = stars
  this.edges = edges
}

var proto = Triangulation.prototype

function removePair(list, j, k) {
  for(var i=1, n=list.length; i<n; i+=2) {
    if(list[i-1] === j && list[i] === k) {
      list[i-1] = list[n-2]
      list[i] = list[n-1]
      list.length = n - 2
      return
    }
  }
}

proto.isConstraint = (function() {
  var e = [0,0]
  function compareLex(a, b) {
    return a[0] - b[0] || a[1] - b[1]
  }
  return function(i, j) {
    e[0] = Math.min(i,j)
    e[1] = Math.max(i,j)
    return bsearch.eq(this.edges, e, compareLex) >= 0
  }
})()

proto.removeTriangle = function(i, j, k) {
  var stars = this.stars
  removePair(stars[i], j, k)
  removePair(stars[j], k, i)
  removePair(stars[k], i, j)
}

proto.addTriangle = function(i, j, k) {
  var stars = this.stars
  stars[i].push(j, k)
  stars[j].push(k, i)
  stars[k].push(i, j)
}

proto.opposite = function(j, i) {
  var list = this.stars[i]
  for(var k=1, n=list.length; k<n; k+=2) {
    if(list[k] === j) {
      return list[k-1]
    }
  }
  return -1
}

proto.flip = function(i, j) {
  var a = this.opposite(i, j)
  var b = this.opposite(j, i)
  this.removeTriangle(i, j, a)
  this.removeTriangle(j, i, b)
  this.addTriangle(i, b, a)
  this.addTriangle(j, a, b)
}

proto.edges = function() {
  var stars = this.stars
  var result = []
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i]
    for(var j=0, m=list.length; j<m; j+=2) {
      result.push([list[j], list[j+1]])
    }
  }
  return result
}

proto.cells = function() {
  var stars = this.stars
  var result = []
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i]
    for(var j=0, m=list.length; j<m; j+=2) {
      var s = list[j]
      var t = list[j+1]
      if(i < Math.min(s, t)) {
        result.push([i, s, t])
      }
    }
  }
  return result
}

function createTriangulation(numVerts, edges) {
  var stars = new Array(numVerts)
  for(var i=0; i<numVerts; ++i) {
    stars[i] = []
  }
  return new Triangulation(stars, edges)
}

},{"binary-search-bounds":2}],8:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustDiff = require("robust-subtract")
var robustScale = require("robust-scale")

var NUM_EXPAND = 6

function orientation(n) {
  var fn =
    n === 3 ? inSphere3 :
    n === 4 ? inSphere4 :
    n === 5 ? inSphere5 : inSphere6;

  return fn(robustSum, robustDiff, twoProduct, robustScale)
}

function inSphere0() { return 0 }
function inSphere1() { return 0 }
function inSphere2() { return 0 }

function inSphere3(sum, diff, prod, scale) {
  function exactInSphere3(m0, m1, m2) {
    var w0 = prod(m0[0], m0[0])
    var w0m1 = scale(w0, m1[0])
    var w0m2 = scale(w0, m2[0])
    var w1 = prod(m1[0], m1[0])
    var w1m0 = scale(w1, m0[0])
    var w1m2 = scale(w1, m2[0])
    var w2 = prod(m2[0], m2[0])
    var w2m0 = scale(w2, m0[0])
    var w2m1 = scale(w2, m1[0])
    var p = sum(diff(w2m1, w1m2), diff(w1m0, w0m1))
    var n = diff(w2m0, w0m2)
    var d = diff(p, n)
    return d[d.length - 1]
  }
  return exactInSphere3
}

function inSphere4(sum, diff, prod, scale) {
  function exactInSphere4(m0, m1, m2, m3) {
    var w0 = sum(prod(m0[0], m0[0]), prod(m0[1], m0[1]))
    var w0m1 = scale(w0, m1[0])
    var w0m2 = scale(w0, m2[0])
    var w0m3 = scale(w0, m3[0])
    var w1 = sum(prod(m1[0], m1[0]), prod(m1[1], m1[1]))
    var w1m0 = scale(w1, m0[0])
    var w1m2 = scale(w1, m2[0])
    var w1m3 = scale(w1, m3[0])
    var w2 = sum(prod(m2[0], m2[0]), prod(m2[1], m2[1]))
    var w2m0 = scale(w2, m0[0])
    var w2m1 = scale(w2, m1[0])
    var w2m3 = scale(w2, m3[0])
    var w3 = sum(prod(m3[0], m3[0]), prod(m3[1], m3[1]))
    var w3m0 = scale(w3, m0[0])
    var w3m1 = scale(w3, m1[0])
    var w3m2 = scale(w3, m2[0])
    var p = sum(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))))
    var n = sum(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))))
    var d = diff(p, n)
    return d[d.length - 1]
  }
  return exactInSphere4
}


function inSphere5(sum, diff, prod, scale) {
  function exactInSphere5(m0, m1, m2, m3, m4) {
    var w0 = sum(prod(m0[0], m0[0]), sum(prod(m0[1], m0[1]), prod(m0[2], m0[2])))
    var w0m1 = scale(w0, m1[0])
    var w0m2 = scale(w0, m2[0])
    var w0m3 = scale(w0, m3[0])
    var w0m4 = scale(w0, m4[0])
    var w1 = sum(prod(m1[0], m1[0]), sum(prod(m1[1], m1[1]), prod(m1[2], m1[2])))
    var w1m0 = scale(w1, m0[0])
    var w1m2 = scale(w1, m2[0])
    var w1m3 = scale(w1, m3[0])
    var w1m4 = scale(w1, m4[0])
    var w2 = sum(prod(m2[0], m2[0]), sum(prod(m2[1], m2[1]), prod(m2[2], m2[2])))
    var w2m0 = scale(w2, m0[0])
    var w2m1 = scale(w2, m1[0])
    var w2m3 = scale(w2, m3[0])
    var w2m4 = scale(w2, m4[0])
    var w3 = sum(prod(m3[0], m3[0]), sum(prod(m3[1], m3[1]), prod(m3[2], m3[2])))
    var w3m0 = scale(w3, m0[0])
    var w3m1 = scale(w3, m1[0])
    var w3m2 = scale(w3, m2[0])
    var w3m4 = scale(w3, m4[0])
    var w4 = sum(prod(m4[0], m4[0]), sum(prod(m4[1], m4[1]), prod(m4[2], m4[2])))
    var w4m0 = scale(w4, m0[0])
    var w4m1 = scale(w4, m1[0])
    var w4m2 = scale(w4, m2[0])
    var w4m3 = scale(w4, m3[0])
    var p = sum(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), m1[2]), sum(scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), -m2[2]), scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), m3[2]))), sum(scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), -m4[2]), sum(scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), m0[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m1[2])))), sum(sum(scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), m3[2]), sum(scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), -m4[2]), scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), m0[2]))), sum(scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m1[2]), sum(scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m3[2])))))
    var n = sum(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), m0[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m2[2])), sum(scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m4[2]))), sum(sum(scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), m0[2]), scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), -m1[2])), sum(scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m4[2]))))
    var d = diff(p, n)
    return d[d.length - 1]
  }

    return exactInSphere5
}

function inSphere6(sum, diff, prod, scale) {
  function exactInSphere6(m0, m1, m2, m3, m4, m5) {
    var w0 = sum(sum(prod(m0[0], m0[0]), prod(m0[1], m0[1])), sum(prod(m0[2], m0[2]), prod(m0[3], m0[3])))
    var w0m1 = scale(w0, m1[0])
    var w0m2 = scale(w0, m2[0])
    var w0m3 = scale(w0, m3[0])
    var w0m4 = scale(w0, m4[0])
    var w0m5 = scale(w0, m5[0])
    var w1 = sum(sum(prod(m1[0], m1[0]), prod(m1[1], m1[1])), sum(prod(m1[2], m1[2]), prod(m1[3], m1[3])))
    var w1m0 = scale(w1, m0[0])
    var w1m2 = scale(w1, m2[0])
    var w1m3 = scale(w1, m3[0])
    var w1m4 = scale(w1, m4[0])
    var w1m5 = scale(w1, m5[0])
    var w2 = sum(sum(prod(m2[0], m2[0]), prod(m2[1], m2[1])), sum(prod(m2[2], m2[2]), prod(m2[3], m2[3])))
    var w2m0 = scale(w2, m0[0])
    var w2m1 = scale(w2, m1[0])
    var w2m3 = scale(w2, m3[0])
    var w2m4 = scale(w2, m4[0])
    var w2m5 = scale(w2, m5[0])
    var w3 = sum(sum(prod(m3[0], m3[0]), prod(m3[1], m3[1])), sum(prod(m3[2], m3[2]), prod(m3[3], m3[3])))
    var w3m0 = scale(w3, m0[0])
    var w3m1 = scale(w3, m1[0])
    var w3m2 = scale(w3, m2[0])
    var w3m4 = scale(w3, m4[0])
    var w3m5 = scale(w3, m5[0])
    var w4 = sum(sum(prod(m4[0], m4[0]), prod(m4[1], m4[1])), sum(prod(m4[2], m4[2]), prod(m4[3], m4[3])))
    var w4m0 = scale(w4, m0[0])
    var w4m1 = scale(w4, m1[0])
    var w4m2 = scale(w4, m2[0])
    var w4m3 = scale(w4, m3[0])
    var w4m5 = scale(w4, m5[0])
    var w5 = sum(sum(prod(m5[0], m5[0]), prod(m5[1], m5[1])), sum(prod(m5[2], m5[2]), prod(m5[3], m5[3])))
    var w5m0 = scale(w5, m0[0])
    var w5m1 = scale(w5, m1[0])
    var w5m2 = scale(w5, m2[0])
    var w5m3 = scale(w5, m3[0])
    var w5m4 = scale(w5, m4[0])
    var p = sum(sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m3[1]), sum(scale(diff(w5m3, w3m5), -m4[1]), scale(diff(w4m3, w3m4), m5[1]))), m2[2]), scale(sum(scale(diff(w5m4, w4m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m4[1]), scale(diff(w4m2, w2m4), m5[1]))), -m3[2])), sum(scale(sum(scale(diff(w5m3, w3m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m3[1]), scale(diff(w3m2, w2m3), m5[1]))), m4[2]), scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), -m5[2]))), m1[3]), sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m3[1]), sum(scale(diff(w5m3, w3m5), -m4[1]), scale(diff(w4m3, w3m4), m5[1]))), m1[2]), scale(sum(scale(diff(w5m4, w4m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m4[1]), scale(diff(w4m1, w1m4), m5[1]))), -m3[2])), sum(scale(sum(scale(diff(w5m3, w3m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m3[1]), scale(diff(w3m1, w1m3), m5[1]))), m4[2]), scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), -m5[2]))), -m2[3]), scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m4[1]), scale(diff(w4m2, w2m4), m5[1]))), m1[2]), scale(sum(scale(diff(w5m4, w4m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m4[1]), scale(diff(w4m1, w1m4), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m2[1]), scale(diff(w2m1, w1m2), m5[1]))), m4[2]), scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), -m5[2]))), m3[3]))), sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m3, w3m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m3[1]), scale(diff(w3m2, w2m3), m5[1]))), m1[2]), scale(sum(scale(diff(w5m3, w3m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m3[1]), scale(diff(w3m1, w1m3), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m2[1]), scale(diff(w2m1, w1m2), m5[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), -m5[2]))), -m4[3]), scale(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), m1[2]), scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), -m2[2])), sum(scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), -m4[2]))), m5[3])), sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m3[1]), sum(scale(diff(w5m3, w3m5), -m4[1]), scale(diff(w4m3, w3m4), m5[1]))), m1[2]), scale(sum(scale(diff(w5m4, w4m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m4[1]), scale(diff(w4m1, w1m4), m5[1]))), -m3[2])), sum(scale(sum(scale(diff(w5m3, w3m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m3[1]), scale(diff(w3m1, w1m3), m5[1]))), m4[2]), scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), -m5[2]))), m0[3]), scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m3[1]), sum(scale(diff(w5m3, w3m5), -m4[1]), scale(diff(w4m3, w3m4), m5[1]))), m0[2]), scale(sum(scale(diff(w5m4, w4m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m4[1]), scale(diff(w4m0, w0m4), m5[1]))), -m3[2])), sum(scale(sum(scale(diff(w5m3, w3m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m3[1]), scale(diff(w3m0, w0m3), m5[1]))), m4[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m5[2]))), -m1[3])))), sum(sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m4[1]), scale(diff(w4m1, w1m4), m5[1]))), m0[2]), scale(sum(scale(diff(w5m4, w4m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m4[1]), scale(diff(w4m0, w0m4), m5[1]))), -m1[2])), sum(scale(sum(scale(diff(w5m1, w1m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m1[1]), scale(diff(w1m0, w0m1), m5[1]))), m4[2]), scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), -m5[2]))), m3[3]), scale(sum(sum(scale(sum(scale(diff(w5m3, w3m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m3[1]), scale(diff(w3m1, w1m3), m5[1]))), m0[2]), scale(sum(scale(diff(w5m3, w3m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m3[1]), scale(diff(w3m0, w0m3), m5[1]))), -m1[2])), sum(scale(sum(scale(diff(w5m1, w1m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m1[1]), scale(diff(w1m0, w0m1), m5[1]))), m3[2]), scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), -m5[2]))), -m4[3])), sum(scale(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), m0[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m1[2])), sum(scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), m3[2]), scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), -m4[2]))), m5[3]), scale(sum(sum(scale(sum(scale(diff(w5m3, w3m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m3[1]), scale(diff(w3m2, w2m3), m5[1]))), m1[2]), scale(sum(scale(diff(w5m3, w3m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m3[1]), scale(diff(w3m1, w1m3), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m2[1]), scale(diff(w2m1, w1m2), m5[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), -m5[2]))), m0[3]))), sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m3, w3m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m3[1]), scale(diff(w3m2, w2m3), m5[1]))), m0[2]), scale(sum(scale(diff(w5m3, w3m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m3[1]), scale(diff(w3m0, w0m3), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m2[1]), scale(diff(w2m0, w0m2), m5[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m5[2]))), -m1[3]), scale(sum(sum(scale(sum(scale(diff(w5m3, w3m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m3[1]), scale(diff(w3m1, w1m3), m5[1]))), m0[2]), scale(sum(scale(diff(w5m3, w3m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m3[1]), scale(diff(w3m0, w0m3), m5[1]))), -m1[2])), sum(scale(sum(scale(diff(w5m1, w1m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m1[1]), scale(diff(w1m0, w0m1), m5[1]))), m3[2]), scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), -m5[2]))), m2[3])), sum(scale(sum(sum(scale(sum(scale(diff(w5m2, w2m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m2[1]), scale(diff(w2m1, w1m2), m5[1]))), m0[2]), scale(sum(scale(diff(w5m2, w2m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m2[1]), scale(diff(w2m0, w0m2), m5[1]))), -m1[2])), sum(scale(sum(scale(diff(w5m1, w1m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m1[1]), scale(diff(w1m0, w0m1), m5[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m5[2]))), -m3[3]), scale(sum(sum(scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), m0[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m1[2])), sum(scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m3[2]))), m5[3])))))
    var n = sum(sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m3[1]), sum(scale(diff(w5m3, w3m5), -m4[1]), scale(diff(w4m3, w3m4), m5[1]))), m2[2]), scale(sum(scale(diff(w5m4, w4m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m4[1]), scale(diff(w4m2, w2m4), m5[1]))), -m3[2])), sum(scale(sum(scale(diff(w5m3, w3m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m3[1]), scale(diff(w3m2, w2m3), m5[1]))), m4[2]), scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), -m5[2]))), m0[3]), sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m3[1]), sum(scale(diff(w5m3, w3m5), -m4[1]), scale(diff(w4m3, w3m4), m5[1]))), m0[2]), scale(sum(scale(diff(w5m4, w4m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m4[1]), scale(diff(w4m0, w0m4), m5[1]))), -m3[2])), sum(scale(sum(scale(diff(w5m3, w3m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m3[1]), scale(diff(w3m0, w0m3), m5[1]))), m4[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m5[2]))), -m2[3]), scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m4[1]), scale(diff(w4m2, w2m4), m5[1]))), m0[2]), scale(sum(scale(diff(w5m4, w4m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m4[1]), scale(diff(w4m0, w0m4), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m2[1]), scale(diff(w2m0, w0m2), m5[1]))), m4[2]), scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), -m5[2]))), m3[3]))), sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m3, w3m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m3[1]), scale(diff(w3m2, w2m3), m5[1]))), m0[2]), scale(sum(scale(diff(w5m3, w3m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m3[1]), scale(diff(w3m0, w0m3), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m2[1]), scale(diff(w2m0, w0m2), m5[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m5[2]))), -m4[3]), scale(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), m0[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m2[2])), sum(scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m4[2]))), m5[3])), sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m4[1]), scale(diff(w4m2, w2m4), m5[1]))), m1[2]), scale(sum(scale(diff(w5m4, w4m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m4[1]), scale(diff(w4m1, w1m4), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m2[1]), scale(diff(w2m1, w1m2), m5[1]))), m4[2]), scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), -m5[2]))), m0[3]), scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m2[1]), sum(scale(diff(w5m2, w2m5), -m4[1]), scale(diff(w4m2, w2m4), m5[1]))), m0[2]), scale(sum(scale(diff(w5m4, w4m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m4[1]), scale(diff(w4m0, w0m4), m5[1]))), -m2[2])), sum(scale(sum(scale(diff(w5m2, w2m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m2[1]), scale(diff(w2m0, w0m2), m5[1]))), m4[2]), scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), -m5[2]))), -m1[3])))), sum(sum(sum(scale(sum(sum(scale(sum(scale(diff(w5m4, w4m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m4[1]), scale(diff(w4m1, w1m4), m5[1]))), m0[2]), scale(sum(scale(diff(w5m4, w4m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m4[1]), scale(diff(w4m0, w0m4), m5[1]))), -m1[2])), sum(scale(sum(scale(diff(w5m1, w1m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m1[1]), scale(diff(w1m0, w0m1), m5[1]))), m4[2]), scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), -m5[2]))), m2[3]), scale(sum(sum(scale(sum(scale(diff(w5m2, w2m5), m1[1]), sum(scale(diff(w5m1, w1m5), -m2[1]), scale(diff(w2m1, w1m2), m5[1]))), m0[2]), scale(sum(scale(diff(w5m2, w2m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m2[1]), scale(diff(w2m0, w0m2), m5[1]))), -m1[2])), sum(scale(sum(scale(diff(w5m1, w1m5), m0[1]), sum(scale(diff(w5m0, w0m5), -m1[1]), scale(diff(w1m0, w0m1), m5[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m5[2]))), -m4[3])), sum(scale(sum(sum(scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), m0[2]), scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), -m1[2])), sum(scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m4[2]))), m5[3]), scale(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), m1[2]), scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), -m2[2])), sum(scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), -m4[2]))), m0[3]))), sum(sum(scale(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m2[1]), sum(scale(diff(w4m2, w2m4), -m3[1]), scale(diff(w3m2, w2m3), m4[1]))), m0[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m2[2])), sum(scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), m3[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m4[2]))), -m1[3]), scale(sum(sum(scale(sum(scale(diff(w4m3, w3m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m3[1]), scale(diff(w3m1, w1m3), m4[1]))), m0[2]), scale(sum(scale(diff(w4m3, w3m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m3[1]), scale(diff(w3m0, w0m3), m4[1]))), -m1[2])), sum(scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), m3[2]), scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), -m4[2]))), m2[3])), sum(scale(sum(sum(scale(sum(scale(diff(w4m2, w2m4), m1[1]), sum(scale(diff(w4m1, w1m4), -m2[1]), scale(diff(w2m1, w1m2), m4[1]))), m0[2]), scale(sum(scale(diff(w4m2, w2m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m2[1]), scale(diff(w2m0, w0m2), m4[1]))), -m1[2])), sum(scale(sum(scale(diff(w4m1, w1m4), m0[1]), sum(scale(diff(w4m0, w0m4), -m1[1]), scale(diff(w1m0, w0m1), m4[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m4[2]))), -m3[3]), scale(sum(sum(scale(sum(scale(diff(w3m2, w2m3), m1[1]), sum(scale(diff(w3m1, w1m3), -m2[1]), scale(diff(w2m1, w1m2), m3[1]))), m0[2]), scale(sum(scale(diff(w3m2, w2m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m2[1]), scale(diff(w2m0, w0m2), m3[1]))), -m1[2])), sum(scale(sum(scale(diff(w3m1, w1m3), m0[1]), sum(scale(diff(w3m0, w0m3), -m1[1]), scale(diff(w1m0, w0m1), m3[1]))), m2[2]), scale(sum(scale(diff(w2m1, w1m2), m0[1]), sum(scale(diff(w2m0, w0m2), -m1[1]), scale(diff(w1m0, w0m1), m2[1]))), -m3[2]))), m4[3])))))
    var d = diff(p, n)
    return d[d.length - 1]
  }
  return exactInSphere6
}

var CACHED = [
  inSphere0,
  inSphere1,
  inSphere2
]

function slowInSphere(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function proc(slow, o0, o1, o2, o3, o4, o5, o6) {
  function testInSphere(a0, a1, a2, a3, a4, a5) {
    switch (arguments.length) {
      case 0:
      case 1:
        return 0;
      case 2:
        return o2(a0, a1)
      case 3:
        return o3(a0, a1, a2)
      case 4:
        return o4(a0, a1, a2, a3)
      case 5:
        return o5(a0, a1, a2, a3, a4)
      case 6:
        return o6(a0, a1, a2, a3, a4, a5)
    }

    var s = new Array(arguments.length)
    for (var i = 0; i < arguments.length; ++i) {
      s[i] = arguments[i]
    }
    return slow(s)
  }
  return testInSphere
}

function generateInSphereTest() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }

  module.exports = proc.apply(undefined, [slowInSphere].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateInSphereTest()
},{"robust-scale":10,"robust-subtract":11,"robust-sum":12,"two-product":13}],9:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustScale = require("robust-scale")
var robustSubtract = require("robust-subtract")

var NUM_EXPAND = 5

var EPSILON     = 1.1102230246251565e-16
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON

function orientation_3(sum, prod, scale, sub) {
  return function orientation3Exact(m0, m1, m2) {
    var p = sum(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])))
    var n = sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0]))
    var d = sub(p, n)
    return d[d.length - 1]
  }
}

function orientation_4(sum, prod, scale, sub) {
  return function orientation4Exact(m0, m1, m2, m3) {
    var p = sum(sum(scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m1[2]), sum(scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), -m2[2]), scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m3[2]))), sum(scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m3[2]))))
    var n = sum(sum(scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m0[2]), sum(scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m2[2]), scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m3[2]))), sum(scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m2[2]))))
    var d = sub(p, n)
    return d[d.length - 1]
  }
}

function orientation_5(sum, prod, scale, sub) {
  return function orientation5Exact(m0, m1, m2, m3, m4) {
    var p = sum(sum(sum(scale(sum(scale(sum(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m2[2]), sum(scale(sum(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), -m3[2]), scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m4[2]))), m1[3]), sum(scale(sum(scale(sum(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m1[2]), sum(scale(sum(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m3[2]), scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m4[2]))), -m2[3]), scale(sum(scale(sum(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m1[2]), sum(scale(sum(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m2[2]), scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m4[2]))), m3[3]))), sum(scale(sum(scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m1[2]), sum(scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), -m2[2]), scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m3[2]))), -m4[3]), sum(scale(sum(scale(sum(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m1[2]), sum(scale(sum(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m3[2]), scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m4[2]))), m0[3]), scale(sum(scale(sum(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m0[2]), sum(scale(sum(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m3[2]), scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), m4[2]))), -m1[3])))), sum(sum(scale(sum(scale(sum(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m4[2]))), m3[3]), sum(scale(sum(scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m3[2]))), -m4[3]), scale(sum(scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m1[2]), sum(scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), -m2[2]), scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m3[2]))), m0[3]))), sum(scale(sum(scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m0[2]), sum(scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m2[2]), scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m3[2]))), -m1[3]), sum(scale(sum(scale(sum(prod(m1[1], m3[0]), prod(-m3[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m3[2]))), m2[3]), scale(sum(scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m2[2]))), -m3[3])))))
    var n = sum(sum(sum(scale(sum(scale(sum(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m2[2]), sum(scale(sum(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), -m3[2]), scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m4[2]))), m0[3]), scale(sum(scale(sum(prod(m3[1], m4[0]), prod(-m4[1], m3[0])), m0[2]), sum(scale(sum(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m3[2]), scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), m4[2]))), -m2[3])), sum(scale(sum(scale(sum(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m0[2]), sum(scale(sum(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m2[2]), scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m4[2]))), m3[3]), scale(sum(scale(sum(prod(m2[1], m3[0]), prod(-m3[1], m2[0])), m0[2]), sum(scale(sum(prod(m0[1], m3[0]), prod(-m3[1], m0[0])), -m2[2]), scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m3[2]))), -m4[3]))), sum(sum(scale(sum(scale(sum(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m1[2]), sum(scale(sum(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), -m2[2]), scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m4[2]))), m0[3]), scale(sum(scale(sum(prod(m2[1], m4[0]), prod(-m4[1], m2[0])), m0[2]), sum(scale(sum(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m2[2]), scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), m4[2]))), -m1[3])), sum(scale(sum(scale(sum(prod(m1[1], m4[0]), prod(-m4[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m4[0]), prod(-m4[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m4[2]))), m2[3]), scale(sum(scale(sum(prod(m1[1], m2[0]), prod(-m2[1], m1[0])), m0[2]), sum(scale(sum(prod(m0[1], m2[0]), prod(-m2[1], m0[0])), -m1[2]), scale(sum(prod(m0[1], m1[0]), prod(-m1[1], m0[0])), m2[2]))), -m4[3]))))
    var d = sub(p, n)
    return d[d.length - 1]
  }
}

function orientation(n) {
  var fn =
    n === 3 ? orientation_3 :
    n === 4 ? orientation_4 : orientation_5

  return fn(robustSum, twoProduct, robustScale, robustSubtract)
}

var orientation3Exact = orientation(3)
var orientation4Exact = orientation(4)

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) {
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0])
    var r = (a[0] - c[0]) * (b[1] - c[1])
    var det = l - r
    var s
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r)
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0]
    var bdx = b[0] - d[0]
    var cdx = c[0] - d[0]
    var ady = a[1] - d[1]
    var bdy = b[1] - d[1]
    var cdy = c[1] - d[1]
    var adz = a[2] - d[2]
    var bdz = b[2] - d[2]
    var cdz = c[2] - d[2]
    var bdxcdy = bdx * cdy
    var cdxbdy = cdx * bdy
    var cdxady = cdx * ady
    var adxcdy = adx * cdy
    var adxbdy = adx * bdy
    var bdxady = bdx * ady
    var det = adz * (bdxcdy - cdxbdy)
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady)
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz)
    var tol = ERRBOUND4 * permanent
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
]

function slowOrient(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function proc (slow, o0, o1, o2, o3, o4, o5) {
  return function getOrientation(a0, a1, a2, a3, a4) {
    switch (arguments.length) {
      case 0:
      case 1:
        return 0;
      case 2:
        return o2(a0, a1)
      case 3:
        return o3(a0, a1, a2)
      case 4:
        return o4(a0, a1, a2, a3)
      case 5:
        return o5(a0, a1, a2, a3, a4)
    }

    var s = new Array(arguments.length)
    for (var i = 0; i < arguments.length; ++i) {
      s[i] = arguments[i]
    }
    return slow(s)
  }
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateOrientationProc()
},{"robust-scale":10,"robust-subtract":11,"robust-sum":12,"two-product":13}],10:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var twoSum = require("two-sum")

module.exports = scaleLinearExpansion

function scaleLinearExpansion(e, scale) {
  var n = e.length
  if(n === 1) {
    var ts = twoProduct(e[0], scale)
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n)
  var q = [0.1, 0.1]
  var t = [0.1, 0.1]
  var count = 0
  twoProduct(e[0], scale, q)
  if(q[0]) {
    g[count++] = q[0]
  }
  for(var i=1; i<n; ++i) {
    twoProduct(e[i], scale, t)
    var pq = q[1]
    twoSum(pq, t[0], q)
    if(q[0]) {
      g[count++] = q[0]
    }
    var a = t[1]
    var b = q[1]
    var x = a + b
    var bv = x - a
    var y = b - bv
    q[1] = x
    if(y) {
      g[count++] = y
    }
  }
  if(q[1]) {
    g[count++] = q[1]
  }
  if(count === 0) {
    g[count++] = 0.0
  }
  g.length = count
  return g
}
},{"two-product":13,"two-sum":14}],11:[function(require,module,exports){
"use strict"

module.exports = robustSubtract

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], -f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = -f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = -f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],12:[function(require,module,exports){
"use strict"

module.exports = linearExpansionSum

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],13:[function(require,module,exports){
"use strict"

module.exports = twoProduct

var SPLITTER = +(Math.pow(2, 27) + 1.0)

function twoProduct(a, b, result) {
  var x = a * b

  var c = SPLITTER * a
  var abig = c - a
  var ahi = c - abig
  var alo = a - ahi

  var d = SPLITTER * b
  var bbig = d - b
  var bhi = d - bbig
  var blo = b - bhi

  var err1 = x - (ahi * bhi)
  var err2 = err1 - (alo * bhi)
  var err3 = err2 - (ahi * blo)

  var y = alo * blo - err3

  if(result) {
    result[0] = y
    result[1] = x
    return result
  }

  return [ y, x ]
}
},{}],14:[function(require,module,exports){
"use strict"

module.exports = fastTwoSum

function fastTwoSum(a, b, result) {
	var x = a + b
	var bv = x - a
	var av = x - bv
	var br = b - bv
	var ar = a - av
	if(result) {
		result[0] = ar + br
		result[1] = x
		return result
	}
	return [ar+br, x]
}
},{}]},{},[1]);
