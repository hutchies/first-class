
// @ts-nocheck

import sowpods from 'pf-sowpods';

import { get } from 'svelte/store';
import { state } from './stores';
import Alea from 'alea';
import { nanoid } from 'nanoid';


function nextLetter(l){
    let letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    if(l == 'Z') return 'Z';
    return letters[letters.indexOf(l) + 1];
}



export function solve(){
    state.update(s => {
        s.savedLog = JSON.parse(JSON.stringify(s.roundLog));
        return s;
    })
    for(let i = 0; i < get(state).roundLog.length; i++){
        let r = get(state).roundLog[i];
        let prev = false;
        let next = false;
        if(i > 0) prev = get(state).roundLog[i - 1].realWord;
        if(i < get(state).roundLog.length - 1){
            let n = get(state).roundLog[i + 1].startingLetter;
            if(n) next = nextLetter(n);
        }
        let possibles = sowpods.filter(w => !w.includes(r.banned));
        if(r.startingLetter) possibles = possibles.filter(w => w.startsWith(r.startingLetter));
        //console.log('basic possibles', possibles);
        if(prev) possibles = possibles.filter(w => w.localeCompare(prev) > 0);
        //console.log('after prev', possibles);
        if(next) possibles = possibles.filter(w => w.localeCompare(next) < 0);
       // console.log('after next', possibles);
        let allPossibles = possibles;
        for(let d of r.dice){
            let filtered = possibles.filter(w => w.includes(d));
            if(filtered.length > 0) possibles = filtered;
        }
        //console.log('after dice', possibles);
        possibles = possibles.sort((a,b) => score(b, i).value - score(a, i).value);
        console.log(`All possible for round ${i+1}`, possibles.map(p => {
            return {
                word: p,
                score: score(p, i).value
            }
        }));
        let chosen = possibles[0];
        if(!chosen){
            console.log('No possible word for this round!');
            chosen = allPossibles[0] || 'IMPOSSIBLE';
        }else if(r.startingLetter){
            state.update(s => {
                s.roundLog[i].word = chosen.slice(1);
                s.roundLog[i].realWord = chosen;
                return s;
            })
        }else{
            state.update(s => {
                s.roundLog[i].word = chosen;
                s.roundLog[i].realWord = chosen;
                s.viewing = 'solution';
                return s;
            })
        }
    }
}

export function unsolve(){
    state.update(s => {
        s.roundLog = JSON.parse(JSON.stringify(s.savedLog));
        s.viewing = 'player';
        s.savedLog = [];
        return s;
    })
}

export function score(word, roundNum){
    // Not checking if the word is allowed within the overall structure,
    // just what it scores now
    // Presumes word supplied is uppercase
    /*round = {
        dice: ['A', 'H', 'K'],
        banned: ['X']
    }*/
    if(!word) return {value: 0};
    let round = get(state).roundLog[roundNum];
    let prevWord = false;
    if(roundNum > 0) prevWord = get(state).roundLog[roundNum - 1].realWord;
    let score = 0;
    if(word.includes(round.banned)) return {value: 0, banned: true, warning: 'banned letter'} // mark a flag too?
    if(!sowpods.verify(word)) return {value: 0, warning: 'not a word'};
    if(word && prevWord && word.localeCompare(prevWord) <= 0) return {value: 0, alphabet: true, warning: 'not in alphabetical order'}
    
    let count = round.dice.filter(d => word.includes(d)).length;
    let multiplier = 1;
    if(count == 3) multiplier = 2; // All letters included!
    let split = word.split(''); // into array
    let diceCounts = {};
    let ticks = 0;
    for(let c of split){
        let matched = round.dice.find(d => d == c);
        if(matched){
            ticks++;
            diceCounts[matched] = (diceCounts[matched] || 0) + 1;
            score += multiplier;
        }
    }
    return {
        value: score,
        diceCounts,
        ticks,
        multiplier
        // extra info
    };
}

let random = new Alea();

export function newRandom(seed = nanoid()){
    random = new Alea(seed);
}

export function randomIndex(array){
    return Math.floor(random() * array.length);
}

export function randomItem(array){
    return array[randomIndex(array)];
}