const params = "2d20kh1+4";


const diceToObject = (d) => {
    //console.log('d : ' + d)
    const dice = d.match(/(?:(\+|\-))?(\d+)d(\d+)(?:(kh|kl|dh|dl)(\d+)?)?(?:(\+|\-)(\d+))?$/);
    //console.log('dice  : ' + dice)
    if(!dice){
        throw new Error("Utilisez une expression valide");
    }else if(dice[2] == 0 || dice[2]>100) {
        throw new Error("Entrez une quantité de dés comprise entre 0 et 100");
    }else if(dice[3] == 0 || dice[3] > 1000){
        throw new Error("Nombre de face de dés invalides")
    }
    
    const obj = {signe: dice[1] ? dice[1] : '+', type:'de', qte:dice[2]!==''? parseInt(dice[2]) : 1, faces: parseInt(dice[3]) , option: { }, flat:{}}
    if(dice[4]){
        obj.option = {mode: dice[4], n:!isNaN(parseInt(dice[5])) ? parseInt(dice[5]):1};
    }
    if(dice[6] && dice[7]){
        obj.flat = {signe:dice[6], value:parseInt(dice[7])}
    }
    return obj;
}

/**
 * Reçoit une chaine de caractère et la convertit en chaine lisible pour le lancer de dés
 * @param {String} params -- Chaine de caractères sous la forme "2d20kh1+2+3d6+1" (kh pour "keep highest, kl pour "keep lowest", dh pour "drop highest", et dl pour "drop lowest")
 * @returns {[{signe: String, type: String, qte:Number, faces:Number, option:{mode:String, n:Number}, flat:{signe: String, value: Number}}]} -- Tableau d'objet sous la forme { signe: '+', type: 'de', qte: 2, faces: 20, option: { mode: kh, n:1 } }
 */
//TODO:Refacto
export const cleanParamsDice = (params) => {
    
    const cleanParams = params.trim().toLowerCase();
    //console.log(cleanParams);
    const dices = cleanParams.match(/(?:(\+|\-))?(\d+)d(\d+)(?:(kh|kl|dh|dl)(\d+)?)?(?:(\+|\-)\d+)?/g);
    console.log(dices);
    const objDice = [];

    dices.forEach(d => {
        objDice.push(diceToObject(d));
    })

    return objDice;
}

/**
 * 
 * @param {{signe: String, type: String, qte:Number, faces:Number, option:{mode:String, n:Number}, flat:{signe: String, value: Number}}} dice -- Exemple : { signe: '+', type: 'de', qte: 4, faces: 6, option: { mode: dl, n:1 }, flat: { signe: '+', value: '4' } } Lance 4 dés à 6 faces, enlève le moins bon résultat et ajoute 4 (3d6dl1+4)
 * @returns {} --  { expression: "2d20kh1+4", des: [15, 9], gardes: [15], total: 19 }
 */
const throwDice = (params) => {
    
    const dices = cleanParamsDice(params)
    const results = [];
    
    for(let i = 0; i < dices.length ; i++){
        results.push({expression:'', des:[], gardes:[], total:0});

        results[i].expression = dices[i].qte + 'd' + dices[i].faces + (dices[i].option.mode?dices[i].option.mode:'') + (dices[i].option.n?dices[i].option.n:0) + (dices[i].flat.signe?dices[i].flat.signe:'+') + (dices[i].flat.value?dices[i].flat.value:0);
   
        for(let j = 1 ; j <= dices[i].qte ; j++){
            const random = Math.floor(Math.random() * dices[i].faces) + 1;
            results[i].des.push(random);
        }

        if(dices[i].option.mode === 'kh'){
            results[i].gardes = keepHighest(results[i].des, dices[i].option.n);
        } else if(dices[i].option.mode === 'kl'){
            results[i].gardes = keepLowest(results[i].des, dices[i].option.n);
        } else if (dices[i].option.mode === 'dl'){
            results[i].gardes = dropLowest(results[i].des, dices[i].option.n);
        } else if (dices[i].option.mode === 'dh'){
            results[i].gardes = keepHighest(results[i].des, dices[i].option.n);
        }else {
            results[i].gardes = results[i].des;
        }

        let total = 0;
        results[i].gardes.forEach(de => {
            total += Number.parseInt(de);
        })
        if(dices[i].flat.signe === '+'){
            total += Number.parseInt(dices[i].flat.value);
        } else if (dices[i].flat.signe === '-'){
            total -= Number.parseInt(dices[i].flat.value);
        }

        results.total = total;
    };
    

    return results;
}


/**
 * Lors d'un envoie de résultats de dés, garde les n meilleurs résultats et les renvoies.
 * @param {Number []} des -- exemple [16, 10]
 * @param {Number} n  -- 1
 * @returns {Number []} -- return [16]
 */
const keepHighest = (des, n) => {
    for (let i = 1; i<=des.length - n ; i++){
        const max = Math.max(...des);
        des = des.filter(item => item == max)

    }
    console.log(des)
    return des;
}

/**
 * Lors d'un envoie de résultats de dés, garde les n moins bons résultats et les renvoies.
 * @param {Number []} des -- exemple [16, 10]
 * @param {Number} n  -- 1
 * @returns {Number []} -- return [10]
 */
const keepLowest = (des, n) => {
    
    for (let i = 1; i<= des.length - n ; i++){
        const min = Math.min(...des);
        des = des.filter(item => item == min)

    }
    console.log(des)
    return des;
}


const dropHighest = (des, n) => {
    
    for (let i = 1; i<= n ; i++){
        const max = Math.max(...des);
        des = des.filter(item => item !== max)

    }
    console.log(des)
    return des;
}

const dropLowest = (des, n) => {
    
    for (let i = 1; i<= n ; i++){
        const min = Math.min(...des);
        des = des.filter(item => item !== min)

    }
    console.log(des)
    return des;
}

console.log(throwDice(params))

//TODO -- Gestion du cas où plusieurs dés sont lancés ex : 2d20kh1+4+3d6+2, le cas où plusieurs chiffres ont le même résultats sur keep ou drop pour ne drop ou keep uniquement le bon nombre de dés