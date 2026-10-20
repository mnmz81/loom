---
title: "מחלקות ב-TypeScript: ‏readonly, ‏private מול #private, ‏abstract"
summary: "שדות ו-strictPropertyInitialization, ‏readonly, ‏private שקיים רק בבדיקה מול #private של JavaScript, ‏abstract ו-implements, ו-parameter properties שלא רצים ב-Node בלי tsx."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 13 }
---

מחלקה ב-TypeScript היא מחלקה של JavaScript עם טיפוסים לשדות ולמתודות. רוב מילות המפתח שנוספות עליה, כמו `readonly`, ‏`private` ו-`abstract`, קיימות רק בבדיקת הטיפוסים ונמחקות לפני הריצה.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## שדות ו-readonly

```typescript
// product.ts
class Product {
  readonly id: number;
  title: string;
  price: number;

  constructor(id: number, title: string) {
    this.id = id;
    this.title = title;
  }
}

const desk = new Product(1, "Desk");
desk.id = 2;
console.log(desk);
```

```text
product.ts(5,3): error TS2564: Property 'price' has no initializer and is not definitely assigned in the constructor.
product.ts(14,6): error TS2540: Cannot assign to 'id' because it is a read-only property.
Product { id: 2, title: 'Desk', price: undefined }
```

- [`strictPropertyInitialization`](https://www.typescriptlang.org/tsconfig/#strictPropertyInitialization), שהיא חלק מ-`strict`, דורשת שכל שדה יקבל ערך בהגדרה או בתוך ה-constructor עצמו. ‏`price` לא קיבל, ובזמן ריצה הוא `undefined`.
- לשדה `readonly` אפשר להציב ערך רק בהגדרה וב-constructor. גם הוא נבדק רק ב-`tsc`: בזמן ריצה `id` השתנה ל-2.

## ‏private מול #private

```typescript
// account.ts
class Account {
  private owner: string;
  #balance = 0;

  constructor(owner: string) {
    this.owner = owner;
  }

  get balance() {
    return this.#balance;
  }

  deposit(amount: number) {
    this.#balance += amount;
  }
}

const acc = new Account("Dana");
acc.deposit(50);
console.log(acc.owner);
console.log((acc as any).owner, acc.balance, Object.keys(acc));
```

```text
account.ts(21,17): error TS2341: Property 'owner' is private and only accessible within class 'Account'.
Dana
Dana 50 [ 'owner' ]
```

‏`private` של TypeScript נבדק רק בזמן הקומפילציה. ‏`tsc` דיווח על שגיאה, אבל Node הריץ את השורה והדפיס את הבעלים, וגם `as any` עוקף את הבדיקה. המדריך קורא לזה [soft private](https://www.typescriptlang.org/docs/handbook/2/classes.html#caveats).

‏`#balance` הוא שדה פרטי של JavaScript עצמה: הוא פרטי גם בזמן ריצה, ולא מופיע ב-`Object.keys`. ‏`acc.#balance` מחוץ למחלקה הוא שגיאת תחביר, עוד לפני שהקוד רץ. ‏`get balance()` הוא getter: נותן לקרוא את הערך כמו שדה (`acc.balance`) בלי לאפשר לשנות אותו.

## ‏abstract ו-implements

```typescript
// shape.ts
interface Named {
  name(): string;
}

abstract class Shape implements Named {
  abstract area(): number;

  name() {
    return `${this.constructor.name}, area ${this.area().toFixed(1)}`;
  }
}

class Square extends Shape {
  size = 2;

  area() {
    return this.size ** 2;
  }
}

class Circle extends Shape {}

new Shape();
console.log(new Square().name());
```

```text
shape.ts(22,7): error TS2515: Non-abstract class 'Circle' does not implement inherited abstract member area from class 'Shape'.
shape.ts(24,1): error TS2511: Cannot create an instance of an abstract class.
Square, area 4.0
```

- [`abstract`](https://www.typescriptlang.org/docs/handbook/2/classes.html#abstract-classes-and-members): מחלקה שמשמשת רק כבסיס. אי אפשר ליצור ממנה מופע (TS2511), וכל מחלקה שיורשת ממנה חייבת לממש את המתודות המופשטות (TS2515).
- ‏`implements Named` בודק שהמחלקה מתאימה לממשק, ולא יותר. הוא לא מוסיף שדות ולא משנה את הטיפוסים של המתודות.

## ‏parameter properties

```typescript
// point.ts (run with tsx)
class Point {
  constructor(
    public readonly x: number,
    private y: number,
  ) {}

  toString() {
    return `(${this.x}, ${this.y})`;
  }
}

console.log(`${new Point(3, 4)}`, new Point(1, 2).x);
```

```text
(3, 4) 1
```

‏`public`, ‏`private`, ‏`protected` או `readonly` לפני פרמטר של constructor יוצרת שדה באותו שם ומציבה בו את הערך. זה [parameter property](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties), והוא מייצר קוד שלא כתוב בקובץ, ולכן Node נכשל עם `TypeScript parameter property is not supported in strip-only mode`, ו-`erasableSyntaxOnly` מדווחת עליו כשגיאה.

### בגרסאות קודמות

ב-Angular, ‏dependency injection נכתב שנים דרך parameter properties: ‏`constructor(private http: HttpClient) {}`. התיעוד של Angular משתמש היום בשדה עם `inject()`: ‏`private http = inject(HttpClient)`, ול-Angular יש [מיגרציה](https://angular.dev/reference/migrations/inject-function) שממירה את הסגנון הישן. שדות `#private` נתמכים מאז [TypeScript 3.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#ecmascript-private-fields), ולכן בקוד ישן יותר תמצאו רק `private`.

## טעויות נפוצות של מתחילים

- **‏`private` לנתון שצריך להיות סודי באמת.** בזמן ריצה הוא שדה רגיל. משתמשים ב-`#`.
- **‏`price!: number` כדי להשתיק את TS2564.** השדה נשאר `undefined` עד שמישהו מציב בו ערך.
- **לצפות ש-`implements` יסיק טיפוסים.** פרמטר של מתודה בלי טיפוס לא מקבל את הטיפוס מהממשק. כותבים אותו במחלקה.

## מה הלאה

בפוסט הבא: מודולים, ‏`import` ו-`export`, ומה ההבדל בין מודול לסקריפט.
