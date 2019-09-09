class A {
  constructor() {
    this.f = ['hello', 'world'];
  }
  doThing() {
    console.error(...this.f);
  }
}
