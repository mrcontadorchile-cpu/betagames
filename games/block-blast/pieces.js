// Piece definitions — all tetrominoes + some trominoes + monominoes
// Each piece is an array of [col, row] offsets from origin (top-left)

const PIECES = [
  // I-4 horizontal
  { cells: [[0,0],[1,0],[2,0],[3,0]], color: 0x00d4ff },
  // I-4 vertical
  { cells: [[0,0],[0,1],[0,2],[0,3]], color: 0x00d4ff },
  // I-3 horizontal
  { cells: [[0,0],[1,0],[2,0]], color: 0xff6b6b },
  // I-3 vertical
  { cells: [[0,0],[0,1],[0,2]], color: 0xff6b6b },
  // O-2x2
  { cells: [[0,0],[1,0],[0,1],[1,1]], color: 0xffd700 },
  // L
  { cells: [[0,0],[0,1],[0,2],[1,2]], color: 0xff8c00 },
  // L mirror
  { cells: [[1,0],[1,1],[1,2],[0,2]], color: 0xff8c00 },
  // J
  { cells: [[0,0],[1,0],[1,1],[1,2]], color: 0x9b59b6 },
  // J mirror
  { cells: [[0,0],[1,0],[0,1],[0,2]], color: 0x9b59b6 },
  // S
  { cells: [[1,0],[2,0],[0,1],[1,1]], color: 0x2ecc71 },
  // Z
  { cells: [[0,0],[1,0],[1,1],[2,1]], color: 0xe74c3c },
  // T
  { cells: [[0,0],[1,0],[2,0],[1,1]], color: 0xf39c12 },
  // T flipped
  { cells: [[1,0],[0,1],[1,1],[2,1]], color: 0xf39c12 },
  // T left
  { cells: [[0,0],[0,1],[1,1],[0,2]], color: 0x1abc9c },
  // T right
  { cells: [[1,0],[0,1],[1,1],[1,2]], color: 0x1abc9c },
  // Single
  { cells: [[0,0]], color: 0xffffff },
  // Domino H
  { cells: [[0,0],[1,0]], color: 0xec407a },
  // Domino V
  { cells: [[0,0],[0,1]], color: 0xec407a },
  // 2x3 block
  { cells: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]], color: 0x42a5f5 },
  // 3x1 + corner
  { cells: [[0,0],[1,0],[2,0],[2,1]], color: 0xab47bc },
  // Corner L
  { cells: [[0,0],[0,1],[1,1]], color: 0x26c6da },
  // Corner J
  { cells: [[1,0],[0,1],[1,1]], color: 0x26c6da },
];

function getRandomPiece() {
  const def = PIECES[Math.floor(Math.random() * PIECES.length)];
  // Deep clone
  return { cells: def.cells.map(c => [...c]), color: def.color };
}

function getThreePieces() {
  return [getRandomPiece(), getRandomPiece(), getRandomPiece()];
}
