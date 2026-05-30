import { test, expect } from '@playwright/test';

test.describe('Etapa 1: RevisÃ£o Frontend (Web Desktop) - Fluxos Principais', () => {
  
  test('Deve renderizar a tela de login corretamente', async ({ page }) => {
    await page.goto('/login');

    // Validar presenÃ§a do logo e campos de entrada
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Validar botÃ£o de submissÃ£o
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Entrar na Dashboard');
  });

  test('Deve exibir erro amigÃ¡vel ao tentar logar com credenciais incorretas', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'usuario_invalido@exemplo.com');
    await page.fill('input[type="password"]', 'senha_incorreta');
    await page.click('button[type="submit"]');
    
    // Validar toast ou mensagem de erro customizada que implementamos
    const toast = page.locator('text=Senha ou e-mail incorreto. Tente novamente.');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Deve carregar a pÃ¡gina de cadastro com seleÃ§Ã£o de planos', async ({ page }) => {
    await page.goto('/register');
    
    // Validar presenÃ§a de opÃ§Ãµes de planos
    await expect(page.locator('text=Selecione o plano ideal')).toBeVisible();
    await expect(page.locator('text=Exclusivo')).toBeVisible();
  });
});
