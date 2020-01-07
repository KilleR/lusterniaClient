export class Player {
  name: string;
  fullname: string;

  static fromJsonString(input: string): Player[] {
    const out = [];
    const jsonInput = JSON.parse(input);
    // console.log('JSON input (players):', jsonInput);

    for (const line of jsonInput) {
      const p = new Player();


      for (const key of Object.keys(line)) {
        // console.log('doing player key:', key, line[key]);
        if (!line.hasOwnProperty(key)) {
          continue;
        }
        p[key] = line[key];
      }
      out.push(p);
    }
    return out;
  }
}
