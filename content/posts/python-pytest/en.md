---
title: "pytest: testing your Python code"
summary: "Write a test as a plain function with assert, run it with pytest, read a failure, check errors with pytest.raises, run one test with several inputs using parametrize, and share setup with fixtures."
date: 2026-10-19
tags: [python]
series: { key: python, order: 34 }
---

A test is a small program that calls your code and checks the result. When you change the code later, running the tests tells you in seconds if something broke. `pytest` is the most popular tool for it: tests are plain functions, and the check is Python's own `assert`.

Every example ran with Python 3.13 and pytest 9.1, checked against the [pytest documentation](https://docs.pytest.org/en/stable/). pytest is not part of Python, so install it in your [virtual environment](en/posts/python-pip/) first:

```bash
python -m pip install pytest
```

## The first test

Here is the code under test, in `cart.py`:

```python
def total(prices, discount=0):
    if not 0 <= discount <= 1:
        raise ValueError("discount must be between 0 and 1")
    return round(sum(prices) * (1 - discount), 2)


def is_even(n):
    return n % 2 == 0
```

The tests go in `test_cart.py`, in the same folder. pytest finds tests by name: files called `test_*.py` or `*_test.py`, and functions inside them whose names start with `test`. Each test calls the code and uses `assert`, which does nothing when its condition is true and fails the test when it is false:

```python
from cart import total


def test_total_sums_prices():
    assert total([10, 20, 5]) == 35


def test_total_with_discount():
    assert total([100], discount=0.25) == 75


def test_empty_cart_is_zero():
    assert total([]) == 0
```

Run `pytest` in that folder:

```bash
pytest
```

```text
collected 3 items

test_cart.py ...                                                         [100%]

============================== 3 passed in 0.01s ===============================
```

Each dot is a passing test. (The output is trimmed to the lines that matter. The full version also lists the platform and versions.)

## Reading a failure

Change the expected value in the second test to a wrong one, `== 80`, and run again:

```text
test_cart.py .F.                                                         [100%]

=================================== FAILURES ===================================
___________________________ test_total_with_discount ___________________________

    def test_total_with_discount():
>       assert total([100], discount=0.25) == 80
E       assert 75.0 == 80
E        +  where 75.0 = total([100], discount=0.25)

test_cart.py:11: AssertionError
=========================== short test summary info ============================
FAILED test_cart.py::test_total_with_discount - assert 75.0 == 80
========================= 1 failed, 2 passed in 0.02s ==========================
```

The `F` marks the failing test. pytest rewrites a plain `assert` to show the values on both sides, so you don't need `print` or a special `assertEqual`. The line starting with `>` is the failing line, and `where 75.0 = total(...)` shows what the call returned.

Compare floats with `pytest.approx`, because `0.1 + 0.2 == 0.3` is false in Python: `assert 0.1 + 0.2 == pytest.approx(0.3)`.

## Testing that an error is raised

Sometimes the correct behavior is an exception ([exceptions post](en/posts/python-exceptions/)). `pytest.raises` passes when the block raises it, and fails when it doesn't. `match` checks the message with a regular expression:

```python
import pytest


def test_bad_discount_raises():
    with pytest.raises(ValueError, match="between 0 and 1"):
        total([10], discount=2)
```

## One test, many inputs

Tests that differ only in their values can share one function with `@pytest.mark.parametrize`. It runs the function once per row, and each row is reported as its own test:

```python
from cart import is_even


@pytest.mark.parametrize("n, expected", [(2, True), (7, False), (0, True)])
def test_is_even(n, expected):
    assert is_even(n) is expected
```

```bash
pytest -v -k even
```

```text
test_cart.py::test_is_even[2-True] PASSED                                [ 33%]
test_cart.py::test_is_even[7-False] PASSED                               [ 66%]
test_cart.py::test_is_even[0-True] PASSED                                [100%]

======================= 3 passed, 4 deselected in 0.01s ========================
```

`-v` lists every test by name, and `-k even` runs only the tests whose name contains `even`. `-x` stops at the first failure, and `--lf` reruns only the tests that failed last time.

## Fixtures: shared setup

A *fixture* is a function that prepares something a test needs. Mark it with `@pytest.fixture`, then add its name as a parameter to any test, and pytest calls it and passes the result in:

```python
@pytest.fixture
def prices():
    return [10, 20, 5]


def test_sum(prices):
    assert sum(prices) == 35


def test_append_does_not_leak(prices):
    prices.append(100)
    assert len(prices) == 4


def test_each_test_gets_fresh_copy(prices):
    assert len(prices) == 3
```

Each test gets a **new** result, so the `append` in the second test doesn't affect the third. pytest also ships with built-in fixtures. `tmp_path` gives a fresh temporary folder (a `pathlib.Path`) for tests that write files.

## Common mistakes

- **A test that never runs.** The file isn't named `test_*.py`, or the function name doesn't start with `test`. `pytest` reports `collected 0 items`.
- **A test with no `assert`.** It passes whatever the code does. Every test should check something.
- **Tests that depend on each other.** A test that needs another test to run first fails when you run it alone with `-k`. Give each test its own setup, with a fixture.
- **`ModuleNotFoundError` for your own code.** It shows up when the tests move to a `tests/` folder and the code can't be imported from there. The [good practices page](https://docs.pytest.org/en/stable/explanation/goodpractices.html) in the docs explains the layouts that work.

## What's next

Next: pydantic, which checks the data your functions receive, and which you can test with pytest.
