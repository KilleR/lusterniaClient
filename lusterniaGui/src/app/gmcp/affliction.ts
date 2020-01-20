export class Affliction {
  name: string;
  cure: string;
  desc: string;

  static fromJsonString(input: string): Affliction[] {
    const out = [];
    let jsonInput = JSON.parse(input);
    console.log('JSON input (afflictions):', jsonInput);

    if (!Array.isArray(jsonInput)) {
      jsonInput = [jsonInput];
    }
    console.log('Looping over (afflictions):', jsonInput);
    for (const line of jsonInput) {
      const aff = new Affliction();

      for (const key of Object.keys(line)) {
        console.log('doing affliction key:', key, line[key]);
        if (!line.hasOwnProperty(key)) {
          continue;
        }
        aff[key] = line[key];
      }
      out.push(aff);
    }
    return out;
  }
}
