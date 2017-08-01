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

    if (expr.$gt) {
      parts.push([
        'greaterthan',
        ['field'].concat(root),
        ['value', expr.$gt]
      ]);
    }

    if (expr.$lte) {
      parts.push([
        'lessequal',
        ['field'].concat(root),
        ['value', expr.$lte]
      ]);
    }

    if (expr.$gte) {
      parts.push([
        'greaterequal',
        ['field'].concat(root),
        ['value', expr.$gte]
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
  if (expr.$mutationType) {
    parts.push(_sqparsePart(expr.$mutationType, ['meta', 'mutationType']));
  }
  if (expr.$expiry) {
    parts.push(_sqparsePart(expr.$expiry, ['meta', 'expiry']));
  }
  if (expr.$lockTime) {
    parts.push(_sqparsePart(expr.$lockTime, ['meta', 'lockTime']));
  }

  var valueExpr = _sqparsePart(expr, ['value']);
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
