---
title: "pydantic: validating data with type hints"
summary: "Describe your data once as a class with type hints and pydantic checks and converts it: BaseModel, ValidationError, Field constraints, nested models, and dicts and JSON in and out."
date: 2026-10-19
tags: [python]
series: { key: python, order: 35 }
---

Data from outside your program, such as a JSON request, a config file or a form, is untrusted. The age may arrive as `"abc"`, the name may be missing. Checking each field by hand with `if` statements gets long fast. [pydantic](https://docs.pydantic.dev/latest/) lets you describe the shape of the data once, with [type hints](en/posts/python-functions/), and does the checking for you.

Every example ran with Python 3.13 and pydantic 2.14. pydantic is not part of Python: install it in your [virtual environment](en/posts/python-pip/) with `python -m pip install pydantic`. The behavior was checked against the [pydantic documentation](https://docs.pydantic.dev/latest/concepts/models/).

## A model

A pydantic *model* is a class that inherits from `BaseModel`, with one annotated line per field: the name, a colon and the type. (Classes get their own post later. For now, read `class User(BaseModel):` as "a User is data with these fields".)

```python
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int
    active: bool = True


user = User(name="Dana", age=31)
print(user)
print(user.name, user.age, user.active)
```

```text
name='Dana' age=31 active=True
Dana 31 True
```

You build a model by passing the fields by name. `active` has a default value, so it can be left out. Without a default, a field is required.

## Validation and conversion

pydantic checks every field against its type. By default it also **converts** values when the conversion is safe, such as the string `"31"` to the number `31`:

```python
user = User(name="Avi", age="31")
print(repr(user.age), type(user.age))
```

```text
31 <class 'int'>
```

When a value can't be converted, you get a `ValidationError` that lists every problem at once, not just the first:

```python
from pydantic import ValidationError

try:
    User(age="abc")
except ValidationError as e:
    print(e)
```

```text
2 validation errors for User
name
  Field required [type=missing, input_value={'age': 'abc'}, input_type=dict]
    For further information visit https://errors.pydantic.dev/2.14/v/missing
age
  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='abc', input_type=str]
    For further information visit https://errors.pydantic.dev/2.14/v/int_parsing
```

Each problem has the field name, a message and the bad input. In code, use `e.errors()`, a list of dicts, to build your own messages. The `ValidationError` is an [exception](en/posts/python-exceptions/), so you handle it with `try` and `except`, as above.

## Constraints with Field

For rules beyond the type, such as "greater than zero" or "at least 2 characters", use `Field`:

```python
from pydantic import Field


class Product(BaseModel):
    title: str = Field(min_length=2)
    price: float = Field(gt=0)
    tags: list[str] = []


print(Product(title="Pen", price=2.5))
try:
    Product(title="P", price=0)
except ValidationError as e:
    for err in e.errors():
        print(err["loc"], err["msg"])
```

```text
title='Pen' price=2.5 tags=[]
('title',) String should have at least 2 characters
('price',) Input should be greater than 0
```

`tags: list[str] = []` looks like the [mutable default trap](en/posts/python-functions/), but pydantic copies the default for each new model, so each product gets its own list.

## Nested models

A field can be another model, or a list of models. pydantic builds the inner objects from nested dicts:

```python
class Address(BaseModel):
    city: str
    zip_code: str


class Customer(BaseModel):
    name: str
    addresses: list[Address]


customer = Customer(
    name="Noa",
    addresses=[{"city": "Haifa", "zip_code": "3303"}],
)
print(customer.addresses[0].city)
print(type(customer.addresses[0]).__name__)
```

```text
Haifa
Address
```

## Dicts and JSON in and out

`model_validate()` builds a model from a dict, and `model_validate_json()` builds one from a JSON string. The reverse is `model_dump()` for a dict and `model_dump_json()` for a JSON string:

```python
data = {"name": "Dana", "age": "31"}
user = User.model_validate(data)
print(user.model_dump())

raw = '{"name": "Avi", "age": 25, "active": false}'
print(User.model_validate_json(raw))
print(user.model_dump_json())
```

```text
{'name': 'Dana', 'age': 31, 'active': True}
name='Avi' age=25 active=False
{"name":"Dana","age":31,"active":true}
```

This is the usual flow: validate once at the edge of the program, where data comes in. After that, the rest of the code works with a model whose fields are known to be valid.

## Common mistakes

- **Expecting an error where pydantic converts.** `age="31"` is accepted. If you need an exact type, pass `strict=True` in the model config or in `Field`, as the [conversion table](https://docs.pydantic.dev/latest/concepts/conversion_table/) describes.
- **Assignment isn't checked by default.** `user.age = "abc"` goes through without validation unless you set `validate_assignment=True` in the model config.
- **Using v1 names.** In pydantic 2, `dict()` and `parse_obj()` are deprecated: use `model_dump()` and `model_validate()`.

## What's next

That's the end of the series for now. Coming up next: reading and writing files, and classes.
