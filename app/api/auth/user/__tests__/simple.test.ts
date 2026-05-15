describe('Simple passing test', () => {
  test('true is true', () => {
    expect(true).toBe(true);
  });

  test('math works', () => {
    expect(2 + 2).toBe(4);
  });

  test('strings work', () => {
    expect('JAR').toBe('JAR');
  });
});
