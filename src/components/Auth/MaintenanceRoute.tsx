import React from 'react';
import MaintenanceService from '../../App/Services/MaintenanceService';
import ServiceUnavailablePage from '../ErrorPages/ServiceUnavailablePage';

interface MaintenanceRouteProps {
  children: React.ReactNode;
}

const MaintenanceRoute: React.FC<MaintenanceRouteProps> = ({ children }) => {
  const maintenanceService = MaintenanceService.getInstance();

  if (maintenanceService.isInMaintenanceMode()) {
    return <ServiceUnavailablePage />;
  }

  return <>{children}</>;
};

export default MaintenanceRoute;
