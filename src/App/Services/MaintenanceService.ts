/**
 * Serviço de Manutenção
 *
 * Este serviço é responsável por gerenciar o estado de manutenção da aplicação,
 * permitindo ativar/desativar o modo de manutenção e verificar se o sistema está
 * em manutenção.
 *
 * Implementa o padrão Singleton para garantir uma única instância do serviço.
 */

class MaintenanceService {
  private static instance: MaintenanceService;
  private isMaintenanceMode = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {
    // Construtor vazio necessário para o padrão Singleton
  }

  public static getInstance(): MaintenanceService {
    if (!MaintenanceService.instance) {
      MaintenanceService.instance = new MaintenanceService();
    }
    return MaintenanceService.instance;
  }

  public setMaintenanceMode(isMaintenance: boolean): void {
    this.isMaintenanceMode = isMaintenance;
    // Aqui você pode adicionar lógica para persistir o estado de manutenção
    // em um banco de dados ou serviço externo
  }

  public isInMaintenanceMode(): boolean {
    return this.isMaintenanceMode;
  }
}

export default MaintenanceService;
