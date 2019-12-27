export class Vitals {
  'hp' = 0;
  'maxhp' = 0;
  'mp' = 0;
  'maxmp' = 0;
  'ego' = 0;
  'maxego' = 0;
  'pow' = 0;
  'maxpow' = 0;
  'reserves' = 0;
  'nl' = 0;
  'awp' = 0;
  'maxawp' = 0;
  'esteem' = 0;
  'karma' = 0;
  'blind' = 0;
  'deaf' = 0;
  'prone' = 0;
  'kafe' = 0;
  'empathy' = 0;
  'stance' = 'string';
  'beastbal' = 0;
  'mount' = '';
  'equilibrium' = 0;
  'balance' = 0;
  'head' = 0;
  'left_arm' = 0;
  'right_arm' = 0;
  'right_leg' = 0;
  'left_leg' = 0;
  'psisub' = 0;
  'psisuper' = 0;
  'psiid' = 0;
  'modulebal' = 0;
  'slush' = 0;
  'ice' = 0;
  'steam' = 0;
  'dust' = 0;
  'healing' = '';
  'sparkleberry' = 0;
  'scroll' = 0;
  'allheale' = 0;
  'bleeding' = 0;
  'bruising' = 0;
  'hemorrhaging' = 0;
  'enigmaticflow' = 0;
  'eflowbal' = 0;
  'headwounds' = 0;
  'chestwounds' = 0;
  'gutwounds' = 0;
  'rightarmwounds' = 0;
  'leftarmwounds' = 0;
  'leftlegwounds' = 0;
  'rightlegwounds' = 0;
  'string' = '';
  'charstats': string[] = [];

  static fromJsonString(input: string): Vitals {
    const v = new Vitals();
    const jsonInput = JSON.parse(input);
    // console.log('JSON input:', jsonInput);
    for (const key of Object.keys(jsonInput)) {
      // console.log('doing vitals key:', key, jsonInput[key]);
      if (!jsonInput.hasOwnProperty(key)) {
        continue;
      }
      switch (key) {
        case 'nl':
          v[key] = parseFloat(jsonInput[key]);
          break;
        case 'stance':
        case 'mount':
        case 'string':
        case 'charstats':
          v[key] = jsonInput[key];
          break;
        default:
          v[key] = parseInt(jsonInput[key], 10);
      }
    }
    return v;
  }
}
