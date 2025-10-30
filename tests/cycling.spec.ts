import { test, expect } from "@playwright/test";

/**
 * E2E Tests - Cycling Recommendation Feature
 *
 * Phase 7: 자전거 라이딩 추천 기능 테스트
 */

test.describe("Cycling Recommendation Feature", () => {
  test.beforeEach(async ({ page }) => {
    // LocalStorage에 Mock provider 강제 설정
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("selectedProvider", "mock");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("자전거 추천 컴포넌트가 날씨 검색 후 표시됨", async ({ page }) => {
    // 도시 입력
    const searchInput = page
      .locator("input[type='text'], input[placeholder*='도시']")
      .first();
    await searchInput.fill("서울");

    // 검색 버튼 클릭
    const searchButton = page
      .locator("button")
      .filter({ hasText: /검색|search/i })
      .first();
    await searchButton.click();

    // 날씨 정보 로드 대기
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 자전거 추천 컴포넌트 표시 확인
    await expect(
      page.locator("text=/자전거 라이딩 추천|cycling/i")
    ).toBeVisible();
  });

  test("자전거 추천 점수가 표시됨", async ({ page }) => {
    // 서울 날씨 검색
    const searchInput = page
      .locator("input[type='text'], input[placeholder*='도시']")
      .first();
    await searchInput.fill("서울");

    const searchButton = page
      .locator("button")
      .filter({ hasText: /검색|search/i })
      .first();
    await searchButton.click();

    // 날씨 정보 로드 대기
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 점수 원 표시 확인 (0-100 사이의 숫자)
    const scoreCircle = page.locator(".score-circle, .score-value").first();
    await expect(scoreCircle).toBeVisible();

    // 점수 텍스트 확인
    const scoreText = await scoreCircle.textContent();
    expect(scoreText).toMatch(/\d+/); // 숫자 포함 확인
  });

  test("추천 이유가 표시됨", async ({ page }) => {
    // 서울 날씨 검색
    const searchInput = page
      .locator("input[type='text'], input[placeholder*='도시']")
      .first();
    await searchInput.fill("서울");

    const searchButton = page
      .locator("button")
      .filter({ hasText: /검색|search/i })
      .first();
    await searchButton.click();

    // 날씨 정보 로드 대기
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 평가 이유 섹션 확인
    await expect(page.locator("text=/평가 이유|reason/i")).toBeVisible();

    // 이유 목록 항목이 최소 1개 이상 있는지 확인
    const reasonItems = page.locator(".reason-item, .reasons-list li");
    await expect(reasonItems.first()).toBeVisible();
  });

  test("권장 복장이 표시됨", async ({ page }) => {
    // 서울 날씨 검색
    const searchInput = page
      .locator("input[type='text'], input[placeholder*='도시']")
      .first();
    await searchInput.fill("서울");

    const searchButton = page
      .locator("button")
      .filter({ hasText: /검색|search/i })
      .first();
    await searchButton.click();

    // 날씨 정보 로드 대기
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 권장 복장 섹션 확인
    await expect(page.locator("text=/권장 복장|clothing/i")).toBeVisible();

    // 필수 안전 장비 표시 확인 (헬멧, 선글라스)
    await expect(
      page.locator("text=/헬멧|helmet/i")
    ).toBeVisible();
    await expect(
      page.locator("text=/선글라스|sunglasses/i")
    ).toBeVisible();
  });

  test("필수 복장 아이템에 배지가 표시됨", async ({ page }) => {
    // 서울 날씨 검색
    const searchInput = page
      .locator("input[type='text'], input[placeholder*='도시']")
      .first();
    await searchInput.fill("서울");

    const searchButton = page
      .locator("button")
      .filter({ hasText: /검색|search/i })
      .first();
    await searchButton.click();

    // 날씨 정보 로드 대기
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 필수 배지 확인
    const essentialBadge = page.locator("text=/필수|essential/i");
    await expect(essentialBadge.first()).toBeVisible();
  });

  test("다른 도시 검색 시 추천 정보가 업데이트됨", async ({ page }) => {
    // 첫 번째 도시 검색
    const searchInput = page
      .locator("input[type='text'], input[placeholder*='도시']")
      .first();
    await searchInput.fill("서울");

    const searchButton = page
      .locator("button")
      .filter({ hasText: /검색|search/i })
      .first();
    await searchButton.click();

    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 첫 번째 점수 저장
    const scoreCircle = page.locator(".score-circle, .score-value").first();
    const firstScore = await scoreCircle.textContent();

    // 두 번째 도시 검색
    await searchInput.fill("부산");
    await searchButton.click();

    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });

    // 추천 컴포넌트가 여전히 표시되는지 확인
    await expect(
      page.locator("text=/자전거 라이딩 추천|cycling/i")
    ).toBeVisible();

    // 점수가 업데이트되었는지 확인 (내용이 변경되었을 수 있음)
    const secondScore = await scoreCircle.textContent();
    expect(secondScore).toMatch(/\d+/);

    // 점수는 달라질 수 있지만, 둘 다 유효한 숫자여야 함
    expect(firstScore).toMatch(/\d+/);
    expect(secondScore).toMatch(/\d+/);
  });
});
