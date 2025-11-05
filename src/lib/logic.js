
// @ts-nocheck

import sowpods from 'pf-sowpods';

import { get } from 'svelte/store';
import { state } from './stores';
import seedrandom from 'seedrandom';
import { nanoid } from 'nanoid';
import { tick } from 'svelte';


function nextLetter(l){
    let letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    if(l == 'Z') return 'Z';
    return letters[letters.indexOf(l) + 1];
}


export async function solve(){
    let already = false;
    state.update(s => {
        s.savedLog = JSON.parse(JSON.stringify(s.roundLog));
        if(s.botLog){
            s.roundLog = JSON.parse(JSON.stringify(s.botLog));
            s.viewing = 'solution';
            already = true;
        }else{
            for(let r of s.roundLog){
                r.realWord = '';
                r.word = '';
                r.filled = false;
                r.score = {value: 0};
            }
        }
        return s;
    })
    if(already) return;
    for(let r = 0; r < get(state).diceList.length; r++){
        console.log(`Solving round ${r + 1}`, get(state).diceList[r]);
        state.update(s => {
            s.solving = `Solving round ${r + 1}...`
            return s;
        })
        await tick();
        let dl = get(state).diceList[r];
        let dice = dl.dice;
        let banned = dl.banned;

        // Do it all in a single loop around the sowpods for max speed, if I can
        let max = {
            word: '',
            score: 0,
            index: -1
        }
        let prev = [];
        let next = [];
        for(let i = 0; i < get(state).roundLog.length; i++){
            prev[i] = false;
            next[i] = false;
            let temp = i;
            while(temp > 0 && !prev[i]){
                temp--;
                prev[i] = get(state).roundLog[temp].realWord || get(state).roundLog[temp].startingLetter || false; 
            }
            temp = i;
            while(temp < get(state).roundLog.length - 1 && !next[i]){
                temp++;
                next[i] = get(state).roundLog[temp].realWord || get(state).roundLog[temp].startingLetter || false; 
            }
        }

        for(let index = 0; index < sowpods.length; index++){
            let w = sowpods[index];
            if(w.includes(r.banned)) continue;
            if(!dice.some(d => w.includes(d))) continue;
            let score = nonAlterScore(r, 0, w).value;
            if(score <= max.score) continue; // Only if it scores bigger than before

            // So now it could be the best option, work out where it can go
            for(let i = 0; i < get(state).roundLog.length; i++){
                let s = get(state).roundLog[i];
                if(s.filled) continue;
                if(s.startingLetter && !w.startsWith(s.startingLetter)) continue;
                if(prev[i] && w.localeCompare(prev[i]) <= 0) continue;
                if(next[i] && w.localeCompare(next[i]) >= 0) continue;
                // Valid, so slot it in here and don't search any more slots
                max.word = w;
                max.index = i;
                max.score = score;
                break;
            }
        }
        /*
        // Basic filtering to have at least one letter in and not banned, i.e. non-zero score
        let possibles = sowpods.filter(w => !w.includes(r.banned) && dice.some(d => w.includes(d)));
        possibles = possibles.sort((a,b) => nonAlterScore(r, 0, b).value - nonAlterScore(r, 0, a).value);
        let max = {
            score: 0,
            index: -1,
            word: ''
        };
        let savedPossibles = [...possibles];
        for(let i = 0; i < get(state).roundLog.length; i++){
            let s = get(state).roundLog[i];
            if(s.filled) continue;
            possibles = [...savedPossibles];
            let prev, next = false;
            let temp = i;
            if(s.startingLetter) possibles = possibles.filter(w => w.startsWith(s.startingLetter));
            while(temp > 0 && !prev){
                temp--;
                prev = get(state).roundLog[temp].realWord || get(state).roundLog[temp].startingLetter || false; 
            }
            temp = i;
            while(temp < get(state).roundLog.length - 1 && !next){
                temp++;
                next = get(state).roundLog[temp].realWord || get(state).roundLog[temp].startingLetter || false; 
            }
            // now we have betweens
            if(prev) possibles = possibles.filter(w => w.localeCompare(prev) > 0);
            if(next) possibles = possibles.filter(w => w.localeCompare(next) < 0);
            // Should still be sorted by score
            if(possibles.length > 0){
                let s = nonAlterScore(r, 0, possibles[0]).value;
                if(s > max.score){
                    max.score = s;
                    max.index = i;
                    max.word = possibles[0];
                }
            }
        }*/
        if(max.index == -1){
            // need to blank one, so blank the first free one
            let rl = get(state).roundLog.find(r => !r.filled);
            rl.dice = [...dl.dice];
            rl.banned = dl.banned;
            rl.realWord = '';
            rl.word = '';
            rl.score = {value: 0, failed: true}
            rl.filled = true;
            rl.round = r + 1;
        }else{
            console.log('found max', max);
            let rl = get(state).roundLog[max.index];
            rl.realWord = max.word;
            rl.word = max.word;
            rl.filled = true;
            rl.dice = [...dl.dice];
            rl.banned = dl.banned;
            if(rl.startingLetter) rl.word = max.word.slice(1);
            rl.score = nonAlterScore(r, max.index, max.word);
            rl.round = r + 1;
        }
    }
    console.log('solved', get(state).roundLog);
    state.update(s => {
        s.viewing = 'solution';
        s.solving = false;
        return s;
    })
    return;
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
        s.botLog = JSON.parse(JSON.stringify(s.roundLog));
        s.roundLog = JSON.parse(JSON.stringify(s.savedLog));
        s.viewing = 'player';
        return s;
    })
}

function setScore(i, score){
    state.update(s => {
            s.roundLog[i].score = score;
            return s;
        })

        return score;
}

export function fix(row){
    state.update(s => {
        s.roundLog[row].filled = true;
        s.roundLog[row].dice = s.diceList[s.round - 1].dice;
        s.roundLog[row].banned = s.diceList[s.round - 1].banned;
        s.roundLog[row].round = s.round;
        if(s.roundLog[row].score.failed){
            s.roundLog[row].realWord = '';
            s.roundLog[row].word = '';
        }
        return s;
    })
}

export function outOfOrder(i){
    let r = get(state).roundLog[i];
    let word = r.realWord;
    if(!word) return false;
    for(let ind = 0; ind < get(state).roundLog.length; ind++){
        if(ind == i) continue;
        let test = get(state).roundLog[ind].realWord || get(state).roundLog[ind].startingLetter;
        if(!test) continue;
        if(ind < i && word.localeCompare(test) < 0) return true;
        if(ind > i && word.localeCompare(test) > 0) return true;
    }
}

function nonAlterScore(roundNum, i, word = false){ // i no longer needed = remove!
    let diceList = get(state).diceList[roundNum];
    let dice = diceList.dice;
    let banned = diceList.banned;
    let round = get(state).roundLog[i];

    
    if(!word) word = round.realWord;
    //console.log('scoring', round, dice, word)
    if(!word){
        return {value: 0, failed: true};
    }
    /*let prevWord = false;
    if(i > 0) prevWord = get(state).roundLog[i - 1].realWord;*/
    let score = 0;
    let warning = false;
    if(!sowpods.verify(word)){
        return {value: 0, failed: true};
    }
    /*if(word && prevWord && word.localeCompare(prevWord) <= 0){
        return setScore(i, {value: 0, alphabet: true, warning: 'not in alphabetical order'});
        return {value: 0, alphabet: true, warning: 'not in alphabetical order'}
    }*/
   
    if(word.includes(banned)){
        return {value: 0, banned: true};

    }
    
    // check alphabetisation
    if(get(state).roundLog.slice(0, i).some(r => (r.realWord || r.startingLetter || '').localeCompare(word) > 0)
    || get(state).roundLog.slice(i+1).some(r => (r.realWord || r.startingLetter || '').localeCompare(word) < 0)){
        warning = `alphabetisation broken`;
    }
        
    let count = dice.filter(d => word.includes(d)).length;
    let multiplier = 1;
    if(count == 3) multiplier = 2; // All letters included!
    let split = word.split(''); // into array
    let diceCounts = {};
    let ticks = 0;
    for(let c of split){
        let matched = dice.find(d => d == c);
        if(matched){
            ticks++;
            diceCounts[matched] = (diceCounts[matched] || 0) + 1;
            score += multiplier;
        }
    }
   // setScore(roundNum, score);
    return  {
        value: score,
        diceCounts,
        ticks,
        warning,
        multiplier
        // extra info
    };
}

export function score(roundNum, i){
    // Not checking if the word is allowed within the overall structure,
    // just what it scores now
    // Presumes word supplied is uppercase
    /*round = {
        dice: ['A', 'H', 'K'],
        banned: ['X']
    }*/
    let score = nonAlterScore(roundNum, i);
    return setScore(i, score);
}

export function rescoreAll(){
    for(let i = 0; i < get(state).roundLog.length; i++){
        score(get(state).roundLog[i].round, i);
    }
}

let rng = seedrandom();

export function newRandom(seed = nanoid()){
    rng = seedrandom(seed); 
}

export function randomIndex(array){
    return Math.floor(rng() * array.length);
}

export function randomItem(array){
    return array[randomIndex(array)];
}