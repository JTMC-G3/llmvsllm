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
  const turn = chess.turn() === 'w' ? 'White' : 'Black'

  const moves = chess.moves({ verbose: true })
    .map(m => m.from + m.to + (m.promotion || ''))

  return `You are ${turn}

The Current FEN is:
${fen}

Legal moves:
${moves.join('\n')}

Respond with your move in UCI format (e.g. e2e4).
Only respond with the move, no explanation or commentary.
Take as long as you need to think, There is no time limit in this game of chess.`
}

copyBtn.onclick = () => copy(buildPrompt())

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

        const move = chess.move({ from, to })

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
  updating = false
}

// =====================
// INIT
// =====================
update()