import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
}

export default function EstablishmentSelector({ value, onChange, label = 'Establecimiento', allLabel = 'Todos mis establecimientos' }: Props) {
  const { activeContextId, user } = useAuth();
  const establishments = useQuery({
    queryKey: ['authorized-establishments', activeContextId, user?.id, user?.rol],
    queryFn: authApi.getEstablishments,
    enabled: !!activeContextId,
  });
  const handleChange = (event: SelectChangeEvent) => onChange(event.target.value);

  return (
    <FormControl size="small" sx={{ minWidth: 240 }} error={establishments.isError} disabled={establishments.isLoading}>
      <InputLabel id="establishment-filter-label">{label}</InputLabel>
      <Select labelId="establishment-filter-label" id="establishment-filter" value={value} label={label} onChange={handleChange}>
        <MenuItem value="">{allLabel}</MenuItem>
        {(establishments.data ?? []).map((item) => <MenuItem key={item.id} value={item.id}>{item.nombre}</MenuItem>)}
      </Select>
    </FormControl>
  );
}
