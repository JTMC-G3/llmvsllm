import { Chess } from 'chess.js'
import { Chessground } from 'chessground'

import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

// =====================
// GAME STATE
// =====================
const chess = new Chess()


const savedPGN = localStorage.getItem("saved-pgn")
const pgn = chess.pgn() || '(Game start)'

if (savedPGN) {
  chess.loadPgn(savedPGN)
}

let updating = false

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()

    const move = chess.undo()
    if (move) update()
  }
})



// =====================
// COPY BUTTON
// =====================
const copyBtn = document.createElement('button')
copyBtn.innerText = 'Copy Prompt'
copyBtn.style.position = 'fixed'
copyBtn.style.top = '10px'
copyBtn.style.right = '10px'
copyBtn.style.zIndex = 9999
copyBtn.style.padding = '6px 10px'
copyBtn.style.fontSize = '12px'
document.body.appendChild(copyBtn)

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    document.body.appendChild(t)
    t.select()
    document.execCommand('copy')
    document.body.removeChild(t)
  }
}

// =====================
// PROMPT BUILDER
// =====================
function buildPrompt() {
  const fen = chess.fen()

  const legalMoves = chess
    .moves({ verbose: true })
    .map(m => m.from + m.to + (m.promotion || ''))

  const pgn = chess.pgn() || '(Game start)'

  return `
You are playing ${
    chess.turn() === 'w'
      ? 'White'
      : 'Black'
}.

Current FEN:

${fen}

ASCII board:

${buildAsciiBoard()}

${buildPieceList()}

${buildExtraInfo()}

Game history (PGN):

${pgn}

Legal UCI moves:

${legalMoves.join('\n')}

Respond with exactly one legal move in UCI format.

Examples:

e2e4
g1f3
e7e8q

Do not include explanations or commentary.
You are allowed to Resign by responding with "resign"
You are allowed to ask for a Draw by responding with "draw"
`.trim()
}

copyBtn.onclick = () => copy(buildPrompt())

function getBoardOrientation() {
  return board.state.orientation || 'white'
}

function pixelToSquare(x, y) {
  const boardEl = document.querySelector('cg-board')
  if (!boardEl) return null

  const size = boardEl.getBoundingClientRect().width
  const sq = size / 8

  let file = Math.floor(x / sq)
  let rank = Math.floor(y / sq)

  if (getBoardOrientation() === 'black') {
    file = 7 - file
    rank = 7 - rank
  }

  return (
    String.fromCharCode(97 + file) +
    (8 - rank)
  )
}
function updateACASCompatibility() {
  // Expose current FEN
  window.__ACAS_FEN__ = chess.fen()

  // Expose board orientation
  window.__ACAS_ORIENTATION__ =
    board.state.orientation === 'black' ? 'b' : 'w'

  // Build a square -> piece map
  const pieces = {}

  const boardState = chess.board()

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = boardState[r][f]

      if (!p) continue

      const square =
        String.fromCharCode(97 + f) +
        (8 - r)

      pieces[square] = {
        color: p.color,
        type: p.type
      }
    }
  }

  window.__ACAS_BOARD__ = pieces
}
function buildAsciiBoard() {
  const board = chess.board()

  let out = ''

  for (let rank = 8; rank >= 1; rank--) {
    out += rank + ' | '

    for (let file = 0; file < 8; file++) {
      const piece = board[8 - rank][file]

      if (!piece) {
        out += '. '
      } else {
        let c = piece.type

        if (piece.color === 'w') {
          c = c.toUpperCase()
        }

        out += c + ' '
      }
    }

    out += '\n'
  }

  out += '    a b c d e f g h'

  return out
}

function buildPieceList() {
  const board = chess.board()

  const white = []
  const black = []

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f]

      if (!piece) continue

      const square =
        String.fromCharCode(97 + f) + (8 - r)

      const name = {
        k: 'King',
        q: 'Queen',
        r: 'Rook',
        b: 'Bishop',
        n: 'Knight',
        p: 'Pawn'
      }[piece.type]

      if (piece.color === 'w') {
        white.push(`${name}: ${square}`)
      } else {
        black.push(`${name}: ${square}`)
      }
    }
  }

  return `White pieces:
${white.join('\n')}

Black pieces:
${black.join('\n')}`
}

function buildExtraInfo() {
  const fenParts = chess.fen().split(' ')

  return `
Side to move: ${chess.turn() === 'w' ? 'White' : 'Black'}

In check: ${chess.isCheck() ? 'Yes' : 'No'}

Castling rights: ${fenParts[2]}

En passant square: ${
    fenParts[3] === '-'
      ? 'None'
      : fenParts[3]
  }
`
}

// =====================
// CHECKMATE OVERLAY (BIG TEXT)
// =====================
const overlay = document.createElement('div')
overlay.style.position = 'fixed'
overlay.style.top = '50%'
overlay.style.left = '50%'
overlay.style.transform = 'translate(-50%, -50%)'
overlay.style.padding = '20px 30px'
overlay.style.fontSize = '32px'
overlay.style.fontWeight = 'bold'
overlay.style.color = 'white'
overlay.style.background = 'rgba(0,0,0,0.85)'
overlay.style.borderRadius = '12px'
overlay.style.zIndex = 99999
overlay.style.display = 'none'
overlay.style.textAlign = 'center'
document.body.appendChild(overlay)

// =====================
// MOVE DESTS (lichess dots)
// =====================
function getDests() {
  const dests = new Map()

  chess.moves({ verbose: true }).forEach(m => {
    if (!dests.has(m.from)) dests.set(m.from, [])
    dests.get(m.from).push(m.to)
  })

  return dests
}


function getPGN() {
  return chess.pgn()
}


const downloadBtn = document.createElement('button')
downloadBtn.innerText = 'Download PGN'
downloadBtn.style.position = 'fixed'
downloadBtn.style.top = '45px'
downloadBtn.style.right = '10px'
downloadBtn.style.zIndex = 9999
downloadBtn.style.padding = '6px 10px'
downloadBtn.style.fontSize = '12px'

document.body.appendChild(downloadBtn)

function downloadPGN() {
  const event = prompt("Event name:", "Casual Game") || "Casual Game"
  const white = prompt("White player name:", "White") || "White"
  const black = prompt("Black player name:", "Black") || "Black"
  const site = prompt("Site:", "Local Chess App") || "Local Chess App"
  const date = new Date().toISOString().split('T')[0]

  // set PGN headers inside chess.js
  chess.header(
    'Event', event,
    'White', white,
    'Black', black,
    'Site', site,
    'Date', date
  )

  const pgn = chess.pgn()

  const blob = new Blob([pgn], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${event.replace(/\s+/g, '_')}_${Date.now()}.pgn`
  a.click()

  URL.revokeObjectURL(url)
}

downloadBtn.onclick = downloadPGN

const resetBtn = document.createElement('button')
resetBtn.innerText = 'Reset Game'
resetBtn.style.position = 'fixed'
resetBtn.style.top = '80px'
resetBtn.style.right = '10px'
resetBtn.style.zIndex = 9999
resetBtn.style.padding = '6px 10px'
resetBtn.style.fontSize = '12px'

document.body.appendChild(resetBtn)
resetBtn.onclick = () => {
  if (!confirm('Start a new game? This will erase the current one.')) {
    return
  }

  // Clear saved game
  localStorage.removeItem('saved-pgn')

  // Reset chess.js state
  chess.reset()

  // Hide checkmate overlay
  overlay.style.display = 'none'

  // Refresh the board
  update()
}

const testCheckBtn = document.createElement('button')
testCheckBtn.innerText = 'Test Check'
testCheckBtn.style.position = 'fixed'
testCheckBtn.style.top = '115px'
testCheckBtn.style.right = '10px'
testCheckBtn.style.zIndex = 9999
testCheckBtn.style.padding = '6px 10px'
testCheckBtn.style.fontSize = '12px'

document.body.appendChild(testCheckBtn)
testCheckBtn.onclick = () => {
  chess.load('7k/8/8/5Q2/8/8/8/7K w - - 0 1')

  // Keep localStorage in sync
  localStorage.setItem('saved-pgn', chess.pgn())

  update()
}
const testMateBtn = document.createElement('button')
testMateBtn.innerText = 'Test Checkmate'
testMateBtn.style.position = 'fixed'
testMateBtn.style.top = '150px'
testMateBtn.style.right = '10px'
testMateBtn.style.zIndex = 9999
testMateBtn.style.padding = '6px 10px'
testMateBtn.style.fontSize = '12px'

document.body.appendChild(testMateBtn)
testMateBtn.onclick = () => {
  chess.load('7k/3QQ3/8/8/8/8/8/7K b - - 0 1')

  // Keep persistence in sync
  localStorage.setItem('saved-pgn', chess.pgn())

  update()
}

// =====================
// GAME STATUS
// =====================
function getStatus() {
  if (chess.isCheckmate()) return 'mate'
  if (chess.isCheck()) return 'check'
  return null
}

// =====================
// BOARD INIT
// =====================
const board = Chessground(document.getElementById('board'), {
  fen: chess.fen(),

  orientation: 'white',

  movable: {
    color: 'both',
    free: false,
    dests: getDests(),

    events: {
      after: (from, to) => {
        if (updating) return

        let promotion

const piece = chess.get(from)

if (
  piece?.type === 'p' &&
  (
    (piece.color === 'w' && to.endsWith('8')) ||
    (piece.color === 'b' && to.endsWith('1'))
  )
) {
  promotion = prompt(
    'Promote to (q, r, b, n):',
    'q'
  )?.toLowerCase()

  if (!['q', 'r', 'b', 'n'].includes(promotion)) {
    promotion = 'q'
  }
}

const move = chess.move({
  from,
  to,
  promotion
})

        if (!move) {
          update()
          return
        }

        update()
      }
    }
  }
})

// =====================
// UPDATE ENGINE
// =====================
function update() {
  updating = true

  const status = getStatus()
  const turnColor = chess.turn() === 'w' ? 'white' : 'black'

board.set({
  fen: chess.fen(),

  check:
    chess.isCheck()
      ? (chess.turn() === 'w' ? 'white' : 'black')
      : undefined,

  movable: {
    color: 'both',
    free: false,
    dests: getDests()
  }
})

  // ---------------------
  // CHECKMATE HANDLING
  // ---------------------
  const boardEl = document.querySelector('.cg-board')

  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White'

    overlay.innerText = `CHECKMATE\n${winner} wins`
    overlay.style.display = 'block'

    // optional visual effect (NOT required)
    if (boardEl) {
      boardEl.style.filter = 'hue-rotate(210deg) saturate(1.5)'
    }
  } else {
    overlay.style.display = 'none'

    if (boardEl) {
      boardEl.style.filter = ''
    }
  }

  if (chess.isCheckmate()) {
  downloadBtn.style.background = 'gold'
  downloadBtn.style.fontWeight = 'bold'
  downloadBtn.innerText = 'Download PGN ⭐'
} else {
  downloadBtn.style.background = ''
  downloadBtn.innerText = 'Download PGN'
}
localStorage.setItem("saved-pgn", chess.pgn())
window.__ACAS_FEN__ = chess.fen()
window.__CHESS_FEN__ = chess.fen()
document.body.dataset.fen = chess.fen()
updateACASCompatibility()
  updating = false
}

// =====================
// INIT
// =====================
update()