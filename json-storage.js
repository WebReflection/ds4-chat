const { parse, stringify } = JSON;
const { entries, keys, values } = Object;
const { iterator } = Symbol;

const LOCAL = 'local';
const SESSION = 'session';

const add = (self, key, value) => {
  self.set(key, stringify(value));
  return value;
};

export default class JSONStorage {
  static LOCAL = LOCAL;
  static SESSION = SESSION;

  #storage;

  constructor(storage = LOCAL) {
    this.#storage = storage === LOCAL ? localStorage : sessionStorage;
  }

  clear() {
    this.#storage.clear();
  }

  delete(key) {
    const had = this.has(key);
    if (had) this.#storage.removeItem(key);
    return had;
  }

  get(key) {
    const value = this.#storage.getItem(key);
    return typeof value === 'string' ? parse(value) : void 0;
  }

  getOrInsert(key, value) {
    const current = this.get(key);
    return current !== void 0 ? current : add(this, key, value);
  }

  getOrInsertComputed(key, callback) {
    const current = this.get(key);
    return current !== void 0 ? current : add(this, key, callback(key));
  }

  has(key) {
    return this.#storage.getItem(key) != null;
  }

  set(key, value) {
    this.#storage.setItem(key, stringify(value));
    return this;
  }

  *entries() {
    yield* this[iterator]();
  }

  *keys() {
    yield* keys(this.#storage);
  }

  *values() {
    for (const value of values(this.#storage))
      yield parse(value);
  }

  *[iterator]() {
    for (const [key, value] of entries(this.#storage))
      yield [key, parse(value)];
  }
}
