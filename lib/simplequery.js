'use strict';

function _sqparsePart(expr, root) {
  if (typeof expr === 'string' || typeof expr === 'number') {
    return ['equals',
        ['field'].concat(root),
        ['value', expr]
    ];
  } else if (expr instanceof Object) {
    var parts = [];

    if (expr.$lt) {
      parts.push([
        'lessthan',
        ['field'].concat(root),
        ['value', expr.$lt]
      ]);
    }

    if (expr.$gte) {
      parts.push([
        'greaterequal',
        ['field'].concat(root),
        ['value', expr.$lt]
      ]);
    }

    for (var i in expr) {
      if (expr.hasOwnProperty(i)) {
        if (i[0] === '$') {
          continue;
        }

        var part = _sqparsePart(expr[i], root.concat([i]));
        if (part) {
          parts.push(part);
        }
      }
    }
    if (parts.length === 0) {
      return null;
    } else if (parts.length === 1) {
      return parts[0];
    } else {
      return ['and'].concat(parts);
    }
  } else {
    return 'UNKNOWN';
  }
}

function sqparse(expr) {
  var parts = [];
  if (expr.$key) {
    parts.push(_sqparsePart(expr.$key, ['meta', 'key']));
  }

  var valueExpr = _sqparsePart(expr, []);
  if (valueExpr) {
    parts.push(valueExpr);
  }

  if (parts.length === 0) {
    return null;
  } else if (parts.length === 1) {
    return parts[0];
  } else {
    return ['and'].concat(parts);
  }
}

module.exports.parse = sqparse;
