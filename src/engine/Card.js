export class Card {
  constructor(id, name, top, right, bottom, left, element = null, owner = null, image = null) {
    this.id = id;
    this.name = name;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
    this.element = element;
    this.owner = owner;
    this.image = image;
  }
}
