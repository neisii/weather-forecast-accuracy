import { test } from "@playwright/test";

/**
 * Weather App 스크린샷 촬영 (Phase 7 업데이트)
 *
 * 실행 방법:
 * 1. npm run dev (http://localhost:5173)
 * 2. npx playwright test screenshots.spec.ts
 */

test.describe("Weather App Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    // LocalStorage에 Mock provider 강제 설정
    await page.evaluate(() => {
      localStorage.setItem("selectedProvider", "mock");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("01. 초기 화면", async ({ page }) => {
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "docs/images/01-initial-screen.png",
      fullPage: true,
    });
  });

  test("02. 서울 날씨 검색 결과 - 자전거 추천 포함", async ({ page }) => {
    // 서울 검색
    await page.fill('input[type="text"]', "서울");
    await page.click('button:has-text("검색")');

    // 결과 로딩 대기
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "docs/images/02-seoul-weather-with-cycling.png",
      fullPage: true,
    });
  });

  test("03. 자전거 추천 점수 확대", async ({ page }) => {
    // 서울 검색
    await page.fill('input[type="text"]', "서울");
    await page.click('button:has-text("검색")');

    // 자전거 추천 섹션 대기
    await page.waitForSelector("text=/자전거 라이딩 추천/i", { timeout: 5000 });
    await page.waitForTimeout(500);

    // 자전거 추천 컴포넌트만 스크린샷
    const cyclingComponent = page.locator(".cycling-recommendation").first();
    if (await cyclingComponent.isVisible()) {
      await cyclingComponent.screenshot({
        path: "docs/images/03-cycling-recommendation-detail.png",
      });
    }
  });

  test("04. 부산 날씨", async ({ page }) => {
    await page.fill('input[type="text"]', "부산");
    await page.click('button:has-text("검색")');
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "docs/images/04-busan-weather.png",
      fullPage: true,
    });
  });

  test("05. Provider 선택 UI", async ({ page }) => {
    await page.waitForTimeout(500);

    // Provider selector 확대 캡처
    const providerSelector = page
      .locator('.provider-selector, [class*="provider"]')
      .first();
    if (await providerSelector.isVisible()) {
      await providerSelector.screenshot({
        path: "docs/images/05-provider-selector.png",
      });
    } else {
      // 전체 화면 캡처
      await page.screenshot({
        path: "docs/images/05-provider-selector.png",
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 300 },
      });
    }
  });

  test("06. Quota Status 표시", async ({ page }) => {
    await page.waitForTimeout(500);

    // Quota status 확대 캡처
    const quotaStatus = page.locator('.quota-status, [class*="quota"]').first();
    if (await quotaStatus.isVisible()) {
      await quotaStatus.screenshot({
        path: "docs/images/06-quota-status.png",
      });
    }
  });

  test("07. 정확도 추적 페이지 - 데모 데이터 미리보기", async ({ page }) => {
    // Accuracy 페이지로 이동
    const accuracyLink = page.locator(
      'a:has-text("정확도"), a[href*="accuracy"]',
    );

    if ((await accuracyLink.count()) > 0) {
      await accuracyLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // "데모 데이터로 미리보기" 버튼 클릭
      const demoButton = page.locator(
        'button:has-text("데모 데이터로 미리보기")',
      );
      if (await demoButton.isVisible()) {
        await demoButton.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({
        path: "docs/images/07-accuracy-page-demo.png",
        fullPage: true,
      });
    }
  });

  test("07-2. 정확도 추적 페이지 - 실제 데이터", async ({ page }) => {
    // Accuracy 페이지로 이동
    const accuracyLink = page.locator(
      'a:has-text("정확도"), a[href*="accuracy"]',
    );

    if ((await accuracyLink.count()) > 0) {
      await accuracyLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // 데모 모드 비활성화 토글 클릭
      const demoToggle = page.locator(
        'button:has-text("데모 모드"), input[type="checkbox"]',
      );
      if ((await demoToggle.count()) > 0) {
        await demoToggle.first().click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({
        path: "docs/images/07-accuracy-page-real.png",
        fullPage: true,
      });
    }
  });

  test("08. 모바일 화면 - 초기", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "docs/images/08-mobile-initial.png",
      fullPage: true,
    });
  });

  test("09. 모바일 화면 - 날씨 결과", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="text"]', "서울");
    await page.click('button:has-text("검색")');
    await page.waitForSelector("text=/온도|temperature/i", { timeout: 5000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: "docs/images/09-mobile-weather-result.png",
      fullPage: true,
    });
  });

  test("10. 에러 상태", async ({ page }) => {
    // 잘못된 도시명으로 에러 유도 (Mock provider는 모든 도시 지원하므로 다른 방법 필요)
    // Mock provider를 해제하고 실제 API 사용 시도
    await page.evaluate(() => {
      localStorage.setItem("selectedProvider", "weatherapi");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="text"]', "InvalidCity123XYZ");
    await page.click('button:has-text("검색")');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: "docs/images/10-error-state.png",
      fullPage: true,
    });
  });
});
