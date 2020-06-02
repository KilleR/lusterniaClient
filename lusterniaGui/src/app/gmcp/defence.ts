export class Defence {
  name: string;
  desc: string;

  static fromJsonString(input: string): Defence[] {
    const out = [];
    let jsonInput = JSON.parse(input);
    console.log('JSON input (defences):', jsonInput);

    if (!Array.isArray(jsonInput)) {
      jsonInput = [jsonInput];
    }
    console.log('Looping over (defences):', jsonInput);
    for (const line of jsonInput) {
      const def = new Defence();

      for (const key of Object.keys(line)) {
        console.log('doing defences key:', key, line[key]);
        if (!line.hasOwnProperty(key)) {
          continue;
        }
        def[key] = line[key];
      }
      out.push(def);
    }
    return out;
  }
}
