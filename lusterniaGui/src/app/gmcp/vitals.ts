export class Vitals {
  'hp': number;
  'maxhp': number;
  'mp': number;
  'maxmp': number;
  'ego': number;
  'maxego': number;
  'pow': number;
  'maxpow': number;
  'reserves': number;
  'nl': number;
  'awp': number;
  'maxawp': number;
  'esteem': number;
  'karma': number;
  'blind': number;
  'deaf': number;
  'prone': number;
  'kafe': number;
  'empathy': number;
  'stance': string;
  'beastbal': number;
  'mount': string;
  'equilibrium': number;
  'balance': number;
  'head': number;
  'left_arm': number;
  'right_arm': number;
  'right_leg': number;
  'left_leg': number;
  'psisub': number;
  'psisuper': number;
  'psiid': number;
  'modulebal': number;
  'slush': number;
  'ice': number;
  'steam': number;
  'dust': number;
  'healing': string;
  'sparkleberry': number;
  'scroll': number;
  'allheale': number;
  'bleeding': number;
  'bruising': number;
  'hemorrhaging': number;
  'enigmaticflow': number;
  'eflowbal': number;
  'headwounds': number;
  'chestwounds': number;
  'gutwounds': number;
  'rightarmwounds': number;
  'leftarmwounds': number;
  'leftlegwounds': number;
  'rightlegwounds': number;
  'string': string;
  'charstats': string[];

  static fromJsonString(input: string): Vitals {
    const v = new Vitals();
    const jsonInput = JSON.parse(input);
    console.log('JSON input:', jsonInput);
    for (const key of Object.keys(jsonInput)) {
      console.log('doing vitals key:', key, jsonInput[key]);
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
