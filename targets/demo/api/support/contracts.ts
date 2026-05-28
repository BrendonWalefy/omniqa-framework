import { expect } from '@playwright/test';

type JsonObject = Record<string, unknown>;

export function expectUserContract(user: JsonObject) {
  expect(user).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
      address: expect.any(Object),
      phone: expect.any(String),
      website: expect.any(String),
      company: expect.any(Object)
    })
  );
}

export function expectPostContract(post: JsonObject) {
  expect(post).toEqual(
    expect.objectContaining({
      userId: expect.any(Number),
      id: expect.any(Number),
      title: expect.any(String),
      body: expect.any(String)
    })
  );
}

export function expectCommentContract(comment: JsonObject) {
  expect(comment).toEqual(
    expect.objectContaining({
      postId: expect.any(Number),
      id: expect.any(Number),
      name: expect.any(String),
      email: expect.any(String),
      body: expect.any(String)
    })
  );
}
