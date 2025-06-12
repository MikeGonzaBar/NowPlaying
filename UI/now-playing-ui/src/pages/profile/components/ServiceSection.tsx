import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    CircularProgress,
    Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ServiceCard } from './ServiceCard';
import { getServicesByCategory } from '../utils/serviceConfig';
import { ApiKey, NewApiKey, TraktAuthStatus } from '../types';

interface ServiceSectionProps {
    category: 'Gaming' | 'Movies' | 'Music';
    title: string;
    emoji: string;
    loading: boolean;
    apiKeys: ApiKey[];
    newApiKeys: Record<string, NewApiKey>;
    traktAuthStatus?: TraktAuthStatus | null;
    traktLoading?: boolean;
    isPSNEditing?: boolean;
    psnNPSSO?: string;
    psnUpdating?: boolean;

    // Event handlers
    onNewKeyChange: (serviceName: string, field: 'userId' | 'apiKey', value: string) => void;
    onSaveApiKey: (serviceName: string) => Promise<void>;
    onDeleteApiKey: (apiKeyId: number, serviceName: string) => Promise<void>;
    onPSNEdit?: () => void;
    onPSNCancel?: () => void;
    onPSNSave?: (apiKeyId: number) => Promise<void>;
    onPSNChange?: (value: string) => void;
    onTraktOAuth?: () => Promise<void>;
}

export const ServiceSection: React.FC<ServiceSectionProps> = ({
    category,
    title,
    emoji,
    loading,
    apiKeys,
    newApiKeys,
    traktAuthStatus,
    traktLoading,
    isPSNEditing,
    psnNPSSO,
    psnUpdating,
    onNewKeyChange,
    onSaveApiKey,
    onDeleteApiKey,
    onPSNEdit,
    onPSNCancel,
    onPSNSave,
    onPSNChange,
    onTraktOAuth
}) => {
    const services = getServicesByCategory(category);

    const getApiKeyForService = (serviceName: string) => {
        return apiKeys.find(key => key.service_name === serviceName);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress sx={{ color: '#00a8cc' }} />
            </Box>
        );
    }

    return (
        <Accordion
            defaultExpanded={category === 'Gaming'}
            sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                mb: 2
            }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {emoji} {title}
                </Typography>
            </AccordionSummary>
            <AccordionDetails>
                {services.map((service) => {
                    const existingApiKey = getApiKeyForService(service.name);
                    const newKeyData = newApiKeys[service.name] || { userId: '', apiKey: '' };

                    return (
                        <ServiceCard
                            key={service.name}
                            service={service}
                            existingApiKey={existingApiKey}
                            newKeyData={newKeyData}
                            onNewKeyChange={(field, value) => onNewKeyChange(service.name, field, value)}
                            onSave={() => onSaveApiKey(service.name)}
                            onDelete={() => onDeleteApiKey(existingApiKey!.id, service.displayName)}

                            // PSN specific props
                            isPSNEditing={service.name === 'psn' ? isPSNEditing : false}
                            psnNPSSO={psnNPSSO}
                            psnUpdating={psnUpdating}
                            onPSNEdit={onPSNEdit}
                            onPSNCancel={onPSNCancel}
                            onPSNSave={onPSNSave ? () => onPSNSave(existingApiKey!.id) : undefined}
                            onPSNChange={onPSNChange}

                            // Trakt specific props
                            traktAuthStatus={service.name === 'trakt' ? traktAuthStatus : undefined}
                            traktLoading={traktLoading}
                            onTraktOAuth={onTraktOAuth}
                        />
                    );
                })}
            </AccordionDetails>
        </Accordion>
    );
}; 