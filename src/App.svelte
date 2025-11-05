
<script>
  // @ts-nocheck
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from '/vite.svg'
  import Counter from './lib/Counter.svelte'
    import { fix, outOfOrder, score, solve, unsolve } from './lib/logic';
    import { state } from './lib/stores';
    import { advance, choose, endGame, setupGame, toggle } from './lib/phases';
    import { onMount, tick } from 'svelte';
    import { Timer }  from 'easytimer.js';


  let wordComponents = [];
  let timer = new Timer();

  async function next(forced = false){
   
    if(currentRow != -1){
       fix(currentRow);
    }
    if($state.round < $state.roundLog.length + 1){
      $state.round++;
      let topPoss = $state.roundLog.findIndex(r => !r.filled);
      if(wordComponents[topPoss]){
        queueMicrotask(() => {
          wordComponents[topPoss].focus();
        });
      }
      startTimer();
    }
    if($state.round >= $state.roundLog.length + 1){
        timer.stop();
        timerFinished = true;
        endGame();
    }
  }

  function startTimer(){
    timerFinished = false;
    secsRemaining = 40;
    timer.stop();
    timer.start({
      countdown: true,
      startValues: {seconds: 40},
      callback: (timer) => {
        secsRemaining = timer.getTimeValues().seconds;
        if(secsRemaining == 0){
          timerFinished = true;
          if(currentRow != -1 && $state.round < $state.roundLog.length) score($state.round - 1, currentRow);
          // Force clearing of a thing if need be
        }
      }
    });
  }

  function startGame(){
    $state.round = 1;
    startTimer();
    tick().then(() => wordComponents[0].focus());
    
  }

  let secsRemaining = 40;
  let timerFinished = false;

  let currentRow = 0;


function stats(){
    let scores = [];
    for(let i of Array(100)){
        setupGame();
        solve();
        scores.push($state.total);
    }
    console.log(scores, scores.reduce((a, s) => a+s, 0) / scores.length, Math.max(...scores), Math.min(...scores));
}

function extraClass(r, i){
  if(r.filled){
    if(r.score && r.score.value == 0) return 'failed';
    if(outOfOrder(i)) return 'out_of_order';
    return 'filled';
  }else if($state.roundLog[currentRow] == r){
    return '';
  }else{
    return ''
  }
}

function clearPrev(i){
  if(currentRow != -1 && currentRow != i){
    if(!$state.roundLog[currentRow].filled){
      $state.roundLog[currentRow].word = '';
      $state.roundLog[currentRow].realWord = '';
      $state.roundLog[currentRow].score = {value: 0};
    }
  }
}

function getColour(s){
  let rl = $state.roundLog.filter(r => (r.realWord || r.startingLetter || '').startsWith(s))
  if(rl.length > 0){
    if($state.roundLog.some((r, i) => outOfOrder(i) && (r.realWord || r.startingLetter || '').startsWith(s))) return 'style="color: orange;"'
    return 'style="color: lightgreen;"' // add something for clashes
  }else{
    return '';
  }
}

async function copySeed(){
  await navigator.clipboard.writeText($state.seed);
  message = `Seed copied`;
  setTimeout(() => message = `Click to copy seed`, 5000);
}

let message = `Click to copy seed`;

$: $state.total = $state.roundLog.reduce((a, r) => a + r.score.value, 0);
  
</script>

<main>
  <h1>First Class Letters solo challenge</h1>
  <div style="margin-bottom: 1em;">
    Based on the <a href="https://boardgamegeek.com/boardgame/436932/first-class-letters">game by Peter Hayward</a>.
    Uses the SOWPODS word list from the <a href="https://github.com/pillowfication/pf-sowpods">pf-sowpods library</a>.
  </div>
  {#if $state.gameType}
    <div class="top">
      <div class="challenge_type" on:click={copySeed}>
        {$state.gameType} challenge
        {#if $state.gameType == 'Random'}
          <div class="seed">{message}</div>
        {/if}
      </div>
      {#if $state.round < $state.roundLog.length + 1}
          {@const r = $state.diceList[$state.round - 1]}
          <div class="dice_set">
            {#each r.dice as d}
              <div class="dice {currentRow != -1 && $state.roundLog[currentRow].score.diceCounts && $state.roundLog[currentRow].score.diceCounts[d] ? 'counted' : ''}">
                {d}
              </div>
            {/each}
              <div class="dice {currentRow != - 1 && $state.roundLog[currentRow].score.banned ? 'blocked' : 'banned'}">{r.banned}</div>
          </div>
        {/if}
      <!--{#if $state.round > 0 && $state.round < $state.roundLog.length + 1}
        <div class="timer {secsRemaining < 10 ? 'ending' : ''}">
          {#if secsRemaining}
            {secsRemaining} seconds left
          {:else}
            Time up!
          {/if}
        </div>
      {/if}-->
       {#if $state.choosing}
          <div class="message">
            {$state.choiceMessage}
            {#if $state.selection != -1}
              <button on:click={advance}>Choose</button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
   
  {#if $state.round == 'setup'}
    <button on:click={e => {setupGame('Daily')}}>Play daily challenge!</button>
    <button on:click={e => {setupGame('Random')}}>Play random setup!</button>
    <button on:click={e => {let seed = prompt('Enter seed for game:'); setupGame('Random', seed)}}>Use existing seed!</button>
  {:else if $state.round == 'dice'}
    <div class="starter_dice">
      Starter dice:
      <div class="dice_set">
        {#each $state.starterDice as d}
          <div class="dice">{d}</div>
        {/each}
      </div>
      <button on:click={startGame}>Start game</button>
    </div>
  {:else}
  <div class="vertical">
    <div class="alphabet">{@html 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(s => `<div ${getColour(s, $state)}>${s}</div>`).join('')}</div>
    <div class="gamesheet">
        {#each $state.roundLog as rl, i}
          {@const roundScore = rl.score}
            <div class="row {i % 2 == 1 ? 'stripe' : ''}" class.choosing={$state.choosing} class:selectedRow={$state.selection == i} on:click={e => {toggle(i); if(!rl.filled) currentRow = i;}}>
              <div class="round_count">{rl.round || ''}</div>
              <div class="dice_set">
                {#each rl.dice as d}
                  <div class="dice {roundScore.diceCounts && roundScore.diceCounts[d] ? 'counted' : ''}">
                    {d}
                  </div>
                {/each}
                  <div class="dice {rl.banned && roundScore.banned ? 'blocked' : 'banned'}">{rl.banned}</div>
              </div>
                {#if rl.startingLetter}
                  <div class="merge expand">
                    <div class="starter text">{rl.startingLetter || ''}</div><input bind:this={wordComponents[i]} class="text short expand {extraClass(rl, i)}" disabled={rl.filled || timerFinished} on:focus={e => {clearPrev(i); currentRow = i;}}  bind:value={rl.word} on:keyup={e => {if(e.key == 'Enter') next();}} on:input={e => {rl.realWord = rl.word.toUpperCase(); if(rl.startingLetter) rl.realWord = rl.startingLetter + rl.realWord; score($state.round - 1, i); }} /> 
                  </div>
                {:else}
                  <input bind:this={wordComponents[i]} disabled={rl.filled || timerFinished} class="text expand {extraClass(rl, i)}" bind:value={rl.word} on:keyup={e => {if(e.key == 'Enter') next();}} on:focus={e => {clearPrev(i); currentRow = i;}} on:input={e => {rl.realWord = rl.word.toUpperCase(); if(rl.startingLetter) rl.realWord = rl.startingLetter + rl.realWord; score($state.round - 1, i); }} /> 
                {/if}
              {#if outOfOrder(i, $state)}
                <div class="warning" title="Out of alphabet order!">
                  ⚠️
                </div>
              {/if}
               <div class="next {secsRemaining < 10 && (!timerFinished || !roundScore.value) ? 'ending' : ''}">
                {#if i == currentRow && $state.round <= $state.roundLog.length}
                  {#if secsRemaining} 
                    <button on:click={next}>{secsRemaining}s</button>
                  {:else if roundScore.failed}
                    <button on:click={next}>Wipe</button>
                  {:else}
                    <button on:click={next}>OK</button>
                  {/if}
                {/if}
              </div>
              <div class="matches">
                {#each Array(roundScore.ticks || 0) as _}
                  ✔️
                {/each}
              </div>
              <div class="all">
                {#if roundScore.multiplier == 2}
                  ✔️
                {/if}
              </div>
              
              <div class="score {roundScore.value == 0 || outOfOrder(i, $state) ? 'zero' : ''}">
                {#if rl.realWord}{roundScore.value}{/if}
              </div>
             
            </div>
        {/each}
        {#if $state.round == $state.roundLog.length + 1  && !$state.choosing}
          <div class="row total">
            {#if $state.round == $state.roundLog.length + 1}
              {#if $state.viewing == 'player'}
                <button on:click={solve}>{$state.solving || 'See bot solution'}</button>
              {:else}
                <button on:click={unsolve}>See your solution</button>
              {/if}   
            {/if}
            <div>TOTAL:</div>
            <div class="score">{$state.total}</div>
          </div>
        {/if}
        <div>
        
        <!--{#if $state.round < $state.roundLog.length}
          
          <div><button on:click={e => {$state.round = $state.roundLog.length;}}>Skip to end!</button></div>
          
        {/if}-->
        
        </div>
        
      </div>
  </div>
    
  <br>
  
    {#if $state.round == $state.roundLog.length + 1 && !$state.choosing}
      <button on:click={e => {$state.gameType = false; $state.round = 'setup'}}>New game</button>
    {:else}
      <button on:click={e => {$state.gameType = false; $state.round = 'setup'}}>Abandon and start new game</button>
    {/if}
    
  {/if}
  <br>
</main>

<style>
  :global(body){
    font-family: sans-serif;
  }
  
  .round_count {
    width: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
    color: darkgreen;
    font-weight: bold;
  }

  .top {
    margin-bottom: 1em;
    width: fit-content;
    
    display: flex;
    align-items: center;
    gap: 1em;
  }

  .challenge_type {   
    background-color: lemonchiffon;
    font-weight: bold;
    padding: 0.5em;
  }

  .seed {
    font-weight: bold;
  }

  .total {
    border-top: 1px solid black;
    justify-content: space-between;
  }

  .gamesheet {
    border: 1px solid black;
    max-width: 50em;
    flex-grow: 1;
  }

  .stripe {
    background-color: lightgrey;
    border-top: 1px solid lightskyblue;
  }

  .warning {
    color: red;
    font-size: 1.5em;
    width: 1em;
  }

  .timer {
    font-weight: bold;
    background-color: green;
    color: white;
    padding: 0.5em;
  }


  .next button {
    background-color: green;
    color: white;
    border: none;
  }

  .ending button{
    background-color: red;
  }

  .next {
    width: 3em;
  }

  button {
    height: 2em;
    font-size: 1em;

  }

  .message {
    font-weight: bold;
    color: red;
  }

  .matches {
    border: 1px solid black;
    min-width: 5em;
    height: 2em;
    color: yellow;
    -webkit-text-stroke: 0.2px black;
    display: flex;
    align-items: center;
  }

  .all {
    border-radius: 50%;
    height: 2em;
    width: 2em;
    border: 1px solid black;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .row {
    padding: 0.5em;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    align-items: center;
  }

  .selectedRow {
    background-color: yellow;
  }

  .choosing {
    cursor: pointer;
  }

  h1 {
    font-size: 1.5em;
  }
  
  .expand {
    flex-grow: 1;
  }

  .zero {
    color: red;
  }

  .score {
    border: 1px solid black;
    background-color: lemonchiffon;
    font-weight: bold;
    font-size: 1.2em;
    height: 2em;
    width: 2em;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .alphabet {
    display: flex;
    flex-direction: column;
    background-color: sienna;
    color: white;
    font-weight: bold;
    align-items: center;
    justify-content: space-evenly;
    font-size: 0.8em;
    padding-left: 0.5em;
    padding-right: 0.5em;
  }

  .vertical {
    display: flex;
    flex-wrap: nowrap;

  }


  .dice {
    background-color: #d5c3ac; /* Manilla */
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.8em;
    width: 0.8em;
    height: 0.8em;
    border: 1px solid black;

  }

  .banned {
    background-color: darkred; /* Manilla */
    color: white;
  }

  .blocked {
    background-color: red; /* Manilla */
    color: white;
  }

  .counted {
    background-color: lightgreen;
  }

  .dice_set {
    display: flex;
    gap: 0.2em;
  }

  .starter_dice {
    display: flex;
    align-items: center;
    gap: 1em;
  }

  .text {
    background-color: lightskyblue;
    border: none;
    height: 2em;
    text-transform: uppercase;
    font-weight: bold;
    font-size: 1.2em;
    width: 10em;
  }

  .filled {
    background-color: lightgreen;
  }

  .failed {
    background-color: lightpink;
  }

  .out_of_order {
    background-color: #FFD580;
  }

  .short {
    /*width: 9em;*/
  }

  .starter {
    display: flex;
    align-items: center;
    justify-content: right;
    width: 1em;
    height: 2em;
    padding-top: 0.05em;
    padding-bottom: 0.05em;
    background-color: lightgrey;
  }

  .merge {
    display: flex;
    gap: 0;
  }
</style>
