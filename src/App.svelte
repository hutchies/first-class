
<script>
  // @ts-nocheck
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from '/vite.svg'
  import Counter from './lib/Counter.svelte'
    import { score, solve, unsolve } from './lib/logic';
    import { state } from './lib/stores';
    import { setupGame } from './lib/phases';
    import { onMount, tick } from 'svelte';
    import { Timer }  from 'easytimer.js';


  let wordComponents = [];
  let timer = new Timer();

  function next(){
    if($state.round < $state.roundLog.length + 1){
      $state.round++;
      if(wordComponents[$state.round - 1]){
        queueMicrotask(() => {
          console.log($state.round, wordComponents[$state.round - 1])
          wordComponents[$state.round - 1].focus();
        });
      }
      startTimer();
    }else{
      timerFinished
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
        if(secsRemaining == 0) timerFinished = true;
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
  
</script>

<main>
  <h1>First Class Letters solo challenge</h1>
  <div style="margin-bottom: 1em;">
    Based on the <a href="https://boardgamegeek.com/boardgame/436932/first-class-letters">game by Peter Hayward</a>
  </div>
  {#if $state.gameType}
    <div class="top">
      <div class="challenge_type">
        {$state.gameType} challenge
      </div>
      {#if $state.round > 0 && $state.round < $state.roundLog.length + 1}
        <div class="timer {secsRemaining < 10 ? 'ending' : ''}">
          {#if secsRemaining}
            {secsRemaining} seconds left
          {:else}
            Time up!
          {/if}
        </div>
      {/if}
    </div>
  {/if}
  {#if $state.round == 'setup'}
    <button on:click={e => {setupGame('Daily')}}>Play daily challenge!</button>
    <button on:click={e => {setupGame('Random')}}>Play random setup!</button>
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
    <div class="alphabet {$state.roundLog.some((r, i) => score(r.realWord, i).alphabet) ? 'blocked' : ''}">{@html 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(s => `<div${$state.roundLog.some(r => (r.realWord || r.startingLetter || '').startsWith(s)) ? ' style="color: yellow;"' : ''}>${s}</div>`).join('')}</div>
    <div class="gamesheet">
        {#each $state.roundLog as rl, i}
          {@const roundScore = score(rl.realWord, i)}
            <div class="row {i % 2 == 1 ? 'stripe' : ''}">
              <div class="dice_set">
                {#each rl.dice as d}
                  <div class="dice {roundScore.diceCounts && roundScore.diceCounts[d] ? 'counted' : ''}">
                    {#if $state.round > i}{d}{/if}
                  </div>
                {/each}
                  <div class="dice {roundScore.banned ? 'blocked' : 'banned'}">{#if $state.round > i}{rl.banned}{/if}</div>
              </div>
                {#if rl.startingLetter}
                  <div class="merge expand">
                    <div class="starter text">{rl.startingLetter || ''}</div><input bind:this={wordComponents[i]} class="text short expand" disabled={$state.round != i + 1 || timerFinished}  bind:value={rl.word} on:keyup={e => {if(e.key == 'Enter') next();}} on:input={e => {rl.realWord = rl.word.toUpperCase(); if(rl.startingLetter) rl.realWord = rl.startingLetter + rl.realWord; }} /> 
                  </div>
                {:else}
                  <input bind:this={wordComponents[i]} disabled={$state.round != i + 1 || timerFinished} class="text expand" bind:value={rl.word} on:keyup={e => {if(e.key == 'Enter') next();}}  on:input={e => {rl.realWord = rl.word.toUpperCase(); if(rl.startingLetter) rl.realWord = rl.startingLetter + rl.realWord; }} /> 
                {/if}
              {#if roundScore.warning}
                <div class="warning" title={roundScore.warning}>
                  ⚠️
                </div>
              {/if}
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
              
              <div class="score {roundScore.value == 0 ? 'zero' : ''}">
                {#if rl.realWord}{roundScore.value}{/if}
              </div>
              <div class="next">
                {#if i == $state.round - 1 && $state.round < $state.roundLog.length}
                  <button on:click={next}>Next</button>
                {:else if i == $state.round - 1 && $state.round == $state.roundLog.length}
                  <button on:click={next}>Done</button>
                {/if}
              </div>
            </div>
        {/each}
        {#if $state.round == $state.roundLog.length + 1}
          <div class="row total">
            {#if $state.round == $state.roundLog.length + 1}
              {#if $state.viewing == 'player'}
                <button on:click={solve}>See bot solution</button>
              {:else}
                <button on:click={unsolve}>See your solution</button>
              {/if}   
            {/if}
            <div>TOTAL:</div>
            <div class="score">{$state.roundLog.reduce((a, r, i) => a + score(r.realWord, i).value, 0)}</div>
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
  {#if $state.round == $state.roundLog.length + 1}
    <button on:click={e => {$state.gameType = false; $state.round = 'setup'}}>New game</button>
  {:else}
    <button on:click={e => {$state.gameType = false; $state.round = 'setup'}}>Abandon and start new game</button>
  {/if}
  {/if}
</main>

<style>
  :global(body){
    font-family: sans-serif;
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

  .ending {
    background-color: red;
  }

  .next button {
    background-color: green;
    color: white;
    border: none;
  }

  .next {
    width: 3em;
  }

  button {
    height: 2em;
    font-size: 1em;

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
    flex-wrap: nowrap;
    gap: 0.5em;
    align-items: center;
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
    justify-content: center;
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
