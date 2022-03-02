export enum RoomType {
  RT_DOORREPAIR = 5,
  RT_FEEDTHEGORIYA = 7,
  RT_GAMBLE = 4,
  RT_GANON = 15,
  RT_ITEMPOND = 17,
  RT_LEARNSLASH = 19,
  RT_LEVEL9ENTRANCE = 8,
  RT_MAGICUPGRADE = 18,
  RT_MONEYORLIFE = 12,
  RT_MOREARROWS = 20,
  RT_MOREBOMBS = 11,
  RT_NONE = 0,
  RT_PAYFORINFO = 2,
  RT_POTIONORHEART = 6,
  RT_POTIONSHOP = 9,
  RT_SECRETMONEY = 3,
  RT_SHOP = 10,
  RT_SPECIALITEM = 1,
  RT_STAIRWARP = 14,
  RT_TAKEONEITEM = 21,
  RT_TENRUPEES = 13,
  RT_ZELDA = 16,
}

export enum Sfx {
  SFX_NONE,
  SFX_ARROW,
  SFX_BEAM,
  SFX_BOMB,
  SFX_BRANG,
  SFX_CHIME,
  SFX_CHINK,
  SFX_CLEARED,
  SFX_DODONGO,
  SFX_DOOR,
  SFX_EDEAD,
  SFX_EHIT,
  SFX_ER,
  SFX_FIRE,
  SFX_GANON,
  SFX_GASP,
  SFX_HAMMER,
  SFX_HOOKSHOT,
  SFX_MSG,
  SFX_OUCH,
  SFX_PICKUP,
  SFX_PLACE,
  SFX_PLINK,
  SFX_REFILL,
  SFX_ROAR,
  SFX_SCALE,
  SFX_SEA,
  SFX_SECRET,
  SFX_SPIRAL,
  SFX_STAIRS,
  SFX_SWORD,
  SFX_VADER,
  SFX_WAND,
  SFX_WHISTLE,
  SFX_ZELDA,
  SFX_ZN1CHARGE,
  SFX_ZN1CHARGE2,
  SFX_ZN1DINSFIRE,
  SFX_ZN1FALL,
  SFX_ZN1FARORESWIND,
  SFX_ZN1FIREBALL,
  SFX_ZN1GRASSCUT,
  SFX_ZN1HAMMERPOST,
  SFX_ZN1HOVER,
  SFX_ZN1ICE,
  SFX_ZN1JUMP,
  SFX_ZN1LENSOFF,
  SFX_ZN1LENSON,
  SFX_ZN1NAYRUSLOVE1,
  SFX_ZN1NAYRUSLOVE2,
  SFX_ZN1PUSHBLOCK,
  SFX_ZN1ROCK,
  SFX_ZN1ROCKETDOWN,
  SFX_ZN1ROCKETUP,
  SFX_ZN1SPINATTACK,
  SFX_ZN1SPLASH,
  SFX_ZN1SUMMON,
  SFX_ZN1TAP,
  SFX_ZN1TAP2,
  SFX_ZN1WHIRLWIND,
  SFX_ZN2CANE,
}

export enum SpritePalette {
  spAQUA, spGLEEOK, spDIG, spGANON, spBROWN, spPILE, spBLUE, spRED,
  spGOLD, spICON1, spICON2, spICON3, spICON4, spGLEEOKF, spFROZEN
}

export enum EnemyFamily {
  eeGUY = 0, eeWALK,
  eeSHOOT/*DEPRECATED*/,
  eeTEK, eeLEV, eePEAHAT, eeZORA, eeROCK,
  //8
  eeGHINI, eeARMOS/*DEPRECATED*/, eeKEESE, eeGEL/*DEPRECATED*/, eeZOL/*DEPRECATED*/, eeROPE/*DEPRECATED*/, eeGORIYA/*DEPRECATED*/, eeTRAP,
  //16
  eeWALLM, eeBUBBLE/*DEPRECATED*/, eeVIRE/*DEPRECATED*/, eeLIKE/*DEPRECATED*/, eePOLSV/*DEPRECATED*/, eeWIZZ, eeAQUA, eeMOLD,
  //24
  eeDONGO, eeMANHAN, eeGLEEOK, eeDIG, eeGHOMA, eeLANM, eePATRA, eeGANON,
  //32
  eePROJECTILE, eeGELTRIB/*DEPRECATED*/, eeZOLTRIB/*DEPRECATED*/, eeVIRETRIB/*DEPRECATED*/, eeKEESETRIB/*DEPRECATED*/, eeSPINTILE, eeNONE,
  //39
  eeFAIRY, eeFIRE, eeOTHER, eeMAX250, //eeFire is Other (Floating), eeOther is Other in the Editor.
  eeSCRIPT01, eeSCRIPT02, eeSCRIPT03, eeSCRIPT04, eeSCRIPT05, eeSCRIPT06, eeSCRIPT07, eeSCRIPT08, eeSCRIPT09, eeSCRIPT10,
  eeSCRIPT11, eeSCRIPT12, eeSCRIPT13, eeSCRIPT14, eeSCRIPT15, eeSCRIPT16, eeSCRIPT17, eeSCRIPT18, eeSCRIPT19, eeSCRIPT20,
  eeFFRIENDLY01, eeFFRIENDLY02, eeFFRIENDLY03, eeFFRIENDLY04, eeFFRIENDLY05, eeFFRIENDLY06, eeFFRIENDLY07, eeFFRIENDLY08,
  eeFFRIENDLY09, eeFFRIENDLY10,
  eeMAX
}

export enum EnemyGuyType {
  eNONE = 0,
  gNONE = 0, gABEI, gAMA, gDUDE, gMOBLIN,
  gFIRE, gFAIRY, gGORIYA, gZELDA, gABEI2,
  //10
  gEMPTY, gDUMMY1, gDUMMY2, gDUMMY3, gDUMMY4,
  gDUMMY5, gDUMMY6, gDUMMY7, gDUMMY8, gDUMMY9,
  //20
  eSTART = 20,
  eOCTO1S = 20, eOCTO2S, eOCTO1F, eOCTO2F, eTEK1,
  eTEK2, eLEV1, eLEV2, eMOBLIN1, eMOBLIN2,
  //30
  eLYNEL1, eLYNEL2, ePEAHAT, eZORA, eROCK,
  eGHINI1, eGHINI2, eARMOS, eKEESE1, eKEESE2,
  //40
  eKEESE3, eSTALFOS, eGEL, eZOL, eROPE,
  eGORIYA1, eGORIYA2, eTRAP, eWALLM, eDKNUT1,
  //50
  eDKNUT2, eBUBBLEST, eVIRE, eLIKE, eGIBDO,
  ePOLSV, eWIZ1, eWIZ2, eRAQUAM, eMOLDORM,
  //60
  eDODONGO, eMANHAN, eGLEEOK1, eGLEEOK2, eGLEEOK3,
  eGLEEOK4, eDIG1, eDIG3, eDIGPUP1, eDIGPUP2,
  //70
  eDIGPUP3, eDIGPUP4, eGOHMA1, eGOHMA2, eCENT1,
  eCENT2, ePATRA1, ePATRA2, eGANON, eSTALFOS2,
  //80
  eROPE2, eBUBBLESP, eBUBBLESR, eSHOOTFBALL, eITEMFAIRY,
  eFIRE, eOCTO5, eDKNUT5, eGELTRIB, eZOLTRIB,
  //90
  eKEESETRIB, eVIRETRIB, eDKNUT3, eLAQUAM, eMANHAN2,
  eTRAP_H, eTRAP_V, eTRAP_LR, eTRAP_UD, eFWIZ,
  //100
  eWWIZ, eCEILINGM, eFLOORM, ePATRABS, ePATRAL2,
  ePATRAL3, eBAT, eBATROBE, eBATROBEKING, eGLEEOK1F,
  //110
  eGLEEOK2F, eGLEEOK3F, eGLEEOK4F, eMWIZ, eDODONGOBS,
  eDODONGOF, eTRIGGER, eBUBBLEIT, eBUBBLEIP, eBUBBLEIR,
  //120
  eSTALFOS3, eGOHMA3, eGOHMA4, eNPCSTAND1, eNPCSTAND2,
  eNPCSTAND3, eNPCSTAND4, eNPCSTAND5, eNPCSTAND6, eNPCWALK1,
  //130
  eNPCWALK2, eNPCWALK3, eNPCWALK4, eNPCWALK5, eNPCWALK6,
  eBOULDER, eGORIYA3, eLEV3, eOCTO3S, eOCTO3F,
  //140
  eOCTO4S, eOCTO4F, eTRAP_8WAY, eTRAP_DIAGONAL, eTRAP_SLASH_C,
  eTRAP_SLASH_LOS, eTRAP_BACKSLASH_C, eTRAP_BACKSLASH_LOS, eTRAP_CW_C, eTRAP_CW_LOS,
  //150
  eTRAP_CCW_C, eTRAP_CCW_LOS, eSUMMONER, eIWIZ, eSHOOTMAGIC,
  eSHOOTROCK, eSHOOTSPEAR, eSHOOTSWORD, eSHOOTFLAME, eSHOOTFLAME2,
  //160
  eBOMBCHU, eFGEL, eFZOL, eFGELTRIB, eFZOLTRIB,
  eTEK3, eSPINTILE1, eSPINTILE2, eLYNEL3, eFPEAHAT,
  //170
  eMPOLSV, eWPOLSV, eDKNUT4, eFGHINI, eMGHINI,
  eGRAPBUGHP, eGRAPBUGMP, e177,
}

export enum EnemyAnim {
  aNONE, aFLIP, aUNUSED1, a2FRM, aUNUSED2,
  aOCTO, aTEK, aLEV, aWALK, aZORA,
  aNEWZORA, aGHINI, aARMOS, aROPE, aWALLM,
  aNEWWALLM, aDWALK, aVIRE, a3FRM, aWIZZ,
  aAQUA, aDONGO, aMANHAN, aGLEEOK, aDIG,
  aGHOMA, aLANM, a2FRMPOS, a4FRM4EYE, a4FRM8EYE,
  a4FRM4DIRF, a4FRM4DIR, a4FRM8DIRF, aARMOS4, a4FRMPOS4DIR,
  a4FRMPOS8DIR, aUNUSED3, a4FRM8DIRB, aNEWTEK, a3FRM4DIR,
  a2FRM4DIR, aNEWLEV, a2FRM4EYE, aNEWWIZZ, aNEWDONGO,
  aDONGOBS, a4FRMPOS8DIRF, a4FRMPOS4DIRF, a4FRMNODIR, aGANON, a2FRMB,
  a4FRM8EYEB, a4FRM4EYEB, a4FRM8DIRFB, a4FRM4DIRB, a4FRM4DIRFB, aMAX
}

export enum WeaponType {
  weaptypeNONE, weaptypeSWORD, weaptypeSWORDBEAM, weaptypeBRANG, weaptypeBOMBBLAST,
  weaptypeSBOMBBLAST, weaptypeBOMB, weaptypeSBOMB, weaptypeARROW, weaptypeFIRE,
  weaptypeWHISTLE, weaptypeBAIT, weaptypeWAND, weaptypeMAGIC, weaptypeCANDLE,
  weaptypeWIND, weaptypeREFMAGIC, weaptypeREFFIREBALL, weaptypeREFROCK, weaptypeHAMMER,
  weaptypeHOOKSHOT, weaptype21, weaptype22, weaptypeSPARKLE, weaptype24,
  weaptype25, weaptypeBYRNA, weaptypeREFBEAM, weaptype28, weaptype29,
  weaptypeSCRIPT1, weaptypeSCRIPT2, weaptypeSCRIPT3, weaptypeSCRIPT4, weaptypeSCRIPT5,
  weaptypeSCRIPT6, weaptypeSCRIPT7, weaptypeSCRIPT8, weaptypeSCRIPT9, weaptypeSCRIPT10
};

// Not sure why there are two enums for this ...
export enum WeaponTypeGameEngine {
  // 0
  wNone, wSword, wBeam, wBrang,
  wBomb, wSBomb, wLitBomb, wLitSBomb,
  // 8
  wArrow, wFire, wWhistle, wBait,
  wWand, wMagic, wCatching, wWind,
  // 16
  wRefMagic, wRefFireball, wRefRock, wHammer,
  wHookshot, wHSHandle, wHSChain, wSSparkle,
  // 24
  wFSparkle, wSmack, wPhantom, wCByrna,
  //28
  wRefBeam, wStomp,
  //30
  lwMax,
  // Dummy weapons - must be between lwMax and wEnemyWeapons!
  //31
  wScript1, wScript2, wScript3, wScript4,
  //35
  wScript5, wScript6, wScript7, wScript8,
  //39
  wScript9, wScript10, wIce, wFlame, //ice rod, fire rod
  wSound, // -Z: sound + defence split == digdogger, sound + one hit kill == pols voice -Z
  wThrowRock, wPot, //Thrown pot or rock -Z
  wLit, //Lightning or Electric -Z
  wBombos, wEther, wQuake,// -Z
  wSword180, wSwordLA,
  // Enemy weapons
  wEnemyWeapons = 128,
  //129
  ewFireball, ewArrow, ewBrang, ewSword,
  ewRock, ewMagic, ewBomb, ewSBomb,
  //137
  ewLitBomb, ewLitSBomb, ewFireTrail, ewFlame,
  ewWind, ewFlame2, ewFlame2Trail,
  //145
  ewIce, ewFireball2,
  wMax
};


export enum EnemyDefense {
  edNORMAL, // : IMPLEMENTED : Take damage (or stun)
  edHALFDAMAGE, // : IMPLEMENTED : Take half damage
  edQUARTDAMAGE, // : IMPLEMENTED : Take 0.25 damage
  edSTUNONLY, // : IMPLEMENTED : Stun instead of taking damage.
  edSTUNORCHINK, // : IMPLEMENTED : If damage > 0, stun instead. Else, bounce off.
  edSTUNORIGNORE, // : IMPLEMENTED : If damage > 0, stun instead. Else, ignore.
  edCHINKL1, // : IMPLEMENTED : Bounces off, plays SFX_CHINK
  edCHINKL2, // : IMPLEMENTED : Bounce off unless damage >= 2
  edCHINKL4, //: IMPLEMENTED : Bounce off unless damage >= 4
  edCHINKL6, // : IMPLEMENTED : Bounce off unless damage >= 6
  edCHINKL8, // : IMPLEMENTED : Bounce off unless damage >= 8
  edCHINK, // : IMPLEMENTED : Bounces off, plays SFX_CHINK
  edIGNOREL1, // : IMPLEMENTED : Ignore unless damage > 1.
  edIGNORE, // : IMPLEMENTED : Do Nothing
  edX = edIGNORE,
  ed1HKO, // : IMPLEMENTED : One-hit knock-out
  edCHINKL10, //: IMPLEMENTED : If damage is less than 10
  ed2x, // : IMPLEMENTED : Double damage.
  ed3x, // : IMPLEMENTED : Triple Damage.
  ed4x, // : IMPLEMENTED : 4x damage.
  edHEAL, // : IMPLEMENTED : Gain the weapon damage in HP.
  edTRIGGERSECRETS, // : IMPLEMENTED : Triggers screen secrets.
  edFREEZE, //Freeze solid
  edMSG_NOT_ENABLED, //A message for 'The following are not yet enabled.
  edMSG_LINE, //An entry for the hiriz line in THE zq PULLDOWN
  edLEVELDAMAGE, //Damage * item level
  edLEVELREDUCTION, //Damage / item level

  edSPLIT, //: IMPLEMENTED : causes the enemy to split if it has a split attribute
  edREPLACE, //replaced by next in list?
  edLEVELCHINK2, //If item level is < 2: This needs a weapon variable that is set by 
  edLEVELCHINK3, //If item level is < 3: the item that generates it (itemdata::level stored to
  edLEVELCHINK4, //If item level is < 4: weapon::level, or something similar; then a check to
  edLEVELCHINK5, //If item level is < 5: read weapon::level in hit detection. 
  edSHOCK, //buzz blob
  edEXPLODESMALL, //: IMPLEMENTED : ew bombblast
  edEXPLODELARGE, //: IMPLEMENTED : super bomb blast
  edSTONE, //deadrock

  edBREAKSHIELD, //break the enemy shield
  edRESTORESHIELD, //if the enemy had a shield, reset it
  edSPECIALDROP, //but where to define it?
  edINCREASECOUNTER, //but where to define the counter
  edREDUCECOUNTER, //same problem
  edEXPLODEHARMLESS, //: IMPLEMENTED : boss death explosion; needs different sprites?
  edKILLNOSPLIT, //If sufficient damage to kill it, a splitting enemy just dies.
  edTRIBBLE, //Tribbles on hit. 
  edFIREBALL, //Makes a 1x1 fireball; Z3 Gibdo
  edFIREBALLLARGE, //Makes a 3x3  Z3 Gibdo for large npcs. 
  edSUMMON, //: IMPLEMENTED : Summons a number of enemies as defined by the summon properties of the npc. 
  //edSAVE, edRETRY, edCRASHZC // Sanity Check Required. -Z
  edWINGAME, //Wand of Gamelon. 
  edJUMP, //Z3 stalfos
  edEATHERO, //-G //Is this practical? We need specisal npc mvoement for it. -Z
  edSHOWMESSAGE, //Shows a ZString when hit. e.g., Z3 Ganon
  edSWITCH, //Switch places with the player, as a switchhook does

  edLAST
}

export enum EnemyMisc1 {
  e1tNORMAL, e1tEACHTILE, e1tCONSTANT, e1tHOMINGBRANG = 2, e1tFAST, e1tSLANT, e1t3SHOTS, e1t4SHOTS, e1t5SHOTS, e1t3SHOTSFAST, e1tFIREOCTO, e1t8SHOTS, e1tSUMMON, e1tSUMMONLAYER, e1tLAST
}

export enum EnemyMisc2 {
  e2tNORMAL, e2tSPLITHIT, e2tKEESETRIB = e2tSPLITHIT, e2tSPLIT, e2tFIREOCTO, e2tBOMBCHU, e2tTRIBBLE, e2tLAST
}

export enum EnemyMisc7 {
  e7tNORMAL, e7tTEMPJINX, e7tPERMJINX, e7tUNJINX, e7tTAKEMAGIC, e7tTAKERUPEES, e7tDRUNK,
  // all from this point involve engulfing
  e7tEATITEMS, e7tEATMAGIC, e7tEATRUPEES, e7tEATHURT,
  // all from this point involve dragging
  e7tWALLMASTER, e7tLAST
}

export enum EnemyMisc8 {
  e8tSWORD, e8tITEM, e8tALL, e8tLAST
}

export enum EnemyMisc9 {
  e9tNORMAL, e9tROPE, e9tVIRE, e9tPOLSVOICE, e9tARMOS,
  // remainder unimplemented
  e9tLEEVER, e9tZ3LEEVER, e9tZ3WALK, e9tZ3STALFOS, e9tLAST
}

export enum ItemSet {
  isNONE, isDEFAULT, isBOMBS, isMONEY, isLIFE, isBOMB100, isSBOMB100,
  isMAGIC, isMAGICBOMBS, isMAGICMONEY, isMAGICLIFE, isMAGIC2, isTALLGRASS, isMAX
}
