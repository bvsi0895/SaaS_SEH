import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Card, CardContent, Chip, Divider, FormControl, Grid, InputLabel, MenuItem, Select,
  Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { administracionApi } from '../../api/administracion';
import type { Rol, RolOrganizacion } from '../../types';

const field = { fullWidth: true, size: 'small' as const };
type AccessRow = { id: string; activo: boolean; rol: Rol; organizacionMiembro: { usuario: { nombre: string; apellido: string } } };

export default function AdministracionPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [companyId, setCompanyId] = useState('');
  const [selectedAccess, setSelectedAccess] = useState<AccessRow | null>(null);
  const [orgForm, setOrgForm] = useState({ nombre: '', emailContacto: '', telefono: '', direccion: '', logoUrl: '' });
  const [companyForm, setCompanyForm] = useState({ nombre: '', cuit: '', email: '', telefono: '', direccion: '' });
  const [editCompanyForm, setEditCompanyForm] = useState({ nombre: '', cuit: '', email: '', telefono: '', direccion: '' });
  const [linkEmpresaId, setLinkEmpresaId] = useState('');
  const [estForm, setEstForm] = useState({ nombre: '', codigo: '', direccion: '', sectores: '' });
  const [editingEstId, setEditingEstId] = useState('');
  const [memberForm, setMemberForm] = useState({ email: '', rol: 'AUDITOR_ORGANIZACION' as RolOrganizacion, rolOperativo: 'TECNICO' as Rol });
  const [assignmentMember, setAssignmentMember] = useState('');

  const org = useQuery({ queryKey: ['admin-org'], queryFn: administracionApi.getOrganization });
  const companies = useQuery({ queryKey: ['admin-companies'], queryFn: administracionApi.getCompanies });
  const members = useQuery({ queryKey: ['admin-members'], queryFn: administracionApi.getMembers });
  const selected = useMemo(() => companies.data?.find((item) => item.id === companyId) || companies.data?.[0], [companies.data, companyId]);
  const establishments = useQuery({ queryKey: ['admin-establishments', selected?.id], queryFn: () => administracionApi.getEstablishments(selected!.id), enabled: !!selected?.id });
  const assignments = useQuery({ queryKey: ['admin-assignments', selected?.id], queryFn: () => administracionApi.getAssignments(selected!.id), enabled: !!selected?.id });

  useEffect(() => {
    if (org.data) setOrgForm({ nombre: org.data.nombre, emailContacto: org.data.emailContacto || '', telefono: org.data.telefono || '', direccion: org.data.direccion || '', logoUrl: org.data.logoUrl || '' });
  }, [org.data]);
  useEffect(() => {
    if (selected) setEditCompanyForm({ nombre: selected.empresa.nombre, cuit: selected.empresa.cuit || '', email: selected.empresa.email || '', telefono: selected.empresa.telefono || '', direccion: selected.empresa.direccion || '' });
    if (selected && selected.id !== companyId) setCompanyId(selected.id);
  }, [selected, companyId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-org'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-members'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-establishments'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
  };
  const success = (message: string) => { showSuccess(message); invalidate(); };
  const error = () => showError('No se pudo completar la operación');

  const saveOrg = useMutation({ mutationFn: () => administracionApi.updateOrganization(orgForm), onSuccess: () => success('Organización actualizada'), onError: error });
  const createCompany = useMutation({ mutationFn: () => administracionApi.createCompany(companyForm), onSuccess: () => success('Empresa cliente creada'), onError: error });
  const updateCompany = useMutation({ mutationFn: () => administracionApi.updateCompany(selected!.id, editCompanyForm), onSuccess: () => success('Datos de empresa actualizados'), onError: error });
  const linkCompany = useMutation({ mutationFn: () => administracionApi.linkCompany(linkEmpresaId), onSuccess: () => { setLinkEmpresaId(''); success('Empresa vinculada'); }, onError: error });
  const createEstablishment = useMutation({ mutationFn: () => administracionApi.createEstablishment(selected!.id, estForm), onSuccess: () => { setEstForm({ nombre: '', codigo: '', direccion: '', sectores: '' }); success('Establecimiento creado'); }, onError: error });
  const updateEstablishment = useMutation({ mutationFn: () => administracionApi.updateEstablishment(selected!.id, editingEstId, estForm), onSuccess: () => { setEditingEstId(''); setEstForm({ nombre: '', codigo: '', direccion: '', sectores: '' }); success('Establecimiento actualizado'); }, onError: error });
  const addMember = useMutation({ mutationFn: () => administracionApi.addMember(memberForm), onSuccess: () => success('Miembro incorporado'), onError: error });
  const assign = useMutation({ mutationFn: () => administracionApi.assign(selected!.id, assignmentMember, 'TECNICO'), onSuccess: () => success('Acceso asignado'), onError: error });
  const revokeAccess = useMutation({ mutationFn: () => administracionApi.revokeAssignment(selected!.id, selectedAccess!.id), onSuccess: () => { setSelectedAccess(null); success('Acceso revocado'); }, onError: error });

  const startEstablishmentEdit = (item: { id: string; nombre: string; codigo?: string; direccion?: string; sectores?: string }) => {
    setEditingEstId(item.id);
    setEstForm({ nombre: item.nombre, codigo: item.codigo || '', direccion: item.direccion || '', sectores: item.sectores || '' });
  };

  return <Box>
    <PageHeader title="Administración de consultora" subtitle="Organización, empresas-clientes, establecimientos y técnicos" />
    <Card sx={{ mb: 3 }}><Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ '& .MuiTab-root': { scrollMarginTop: '80px' } }}><Tab label="Organización" /><Tab label="Empresas-clientes" /><Tab label="Establecimientos" /><Tab label="Técnicos y accesos" /></Tabs></Card>

    {tab === 0 && <Card><CardContent><Typography variant="h6" sx={{ mb: 2 }}>Datos comerciales</Typography><Grid container spacing={2}>{[['nombre','Nombre'],['emailContacto','Email de contacto'],['telefono','Teléfono'],['direccion','Dirección'],['logoUrl','URL del logo']].map(([key, label]) => <Grid item xs={12} md={6} key={key}><TextField {...field} label={label} value={orgForm[key as keyof typeof orgForm]} onChange={(e) => setOrgForm({ ...orgForm, [key]: e.target.value })} /></Grid>)}</Grid><Button sx={{ mt: 2 }} variant="contained" onClick={() => saveOrg.mutate()}>Guardar organización</Button></CardContent></Card>}

    {tab === 1 && <Card><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2 }}><Typography variant="h6">Empresas vinculadas</Typography><Button variant="contained" onClick={() => createCompany.mutate()}>Crear empresa</Button></Stack><Grid container spacing={2}>{[['nombre','Nombre'],['cuit','CUIT'],['email','Email'],['telefono','Teléfono'],['direccion','Dirección']].map(([key, label]) => <Grid item xs={12} md={6} key={key}><TextField {...field} label={label} value={companyForm[key as keyof typeof companyForm]} onChange={(e) => setCompanyForm({ ...companyForm, [key]: e.target.value })} /></Grid>)}</Grid><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}><TextField {...field} label="ID de empresa existente" value={linkEmpresaId} onChange={(e) => setLinkEmpresaId(e.target.value)} /><Button variant="outlined" disabled={!linkEmpresaId} onClick={() => linkCompany.mutate()}>Vincular existente</Button></Stack><Divider sx={{ my: 2 }} />{selected && <><Typography variant="subtitle1">Editar empresa seleccionada</Typography><Grid container spacing={2} sx={{ mt: 0.5 }}>{[['nombre','Nombre'],['cuit','CUIT'],['email','Email'],['telefono','Teléfono'],['direccion','Dirección']].map(([key, label]) => <Grid item xs={12} md={6} key={key}><TextField {...field} label={label} value={editCompanyForm[key as keyof typeof editCompanyForm]} onChange={(e) => setEditCompanyForm({ ...editCompanyForm, [key]: e.target.value })} /></Grid>)}</Grid><Button sx={{ mt: 1 }} variant="outlined" onClick={() => updateCompany.mutate()}>Guardar datos comerciales</Button></>}<Divider sx={{ my: 2 }} />{companies.data?.map((item) => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ py: 1 }}><Box><Typography>{item.empresa.nombre}</Typography><Typography variant="caption" color="text.secondary">{item.empresa.cuit || 'Sin CUIT'} · {item.empresa._count?.establecimientos || 0} establecimientos</Typography></Box><Chip label={item.estado} color={item.estado === 'ACTIVA' ? 'success' : 'default'} onClick={() => administracionApi.updateCompanyRelation(item.id, item.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA').then(invalidate).catch(() => showError('No se pudo cambiar el estado'))} /></Stack>)}</CardContent></Card>}

    {tab === 2 && <Card><CardContent><FormControl {...field} sx={{ mb: 2 }}><InputLabel>Empresa cliente</InputLabel><Select value={selected?.id || ''} label="Empresa cliente" onChange={(e) => setCompanyId(e.target.value)}>{companies.data?.map((item) => <MenuItem key={item.id} value={item.id}>{item.empresa.nombre}</MenuItem>)}</Select></FormControl><Grid container spacing={2}>{[['nombre','Nombre'],['codigo','Código'],['direccion','Dirección'],['sectores','Sectores o áreas (separados por coma)']].map(([key, label]) => <Grid item xs={12} md={6} key={key}><TextField {...field} label={label} value={estForm[key as keyof typeof estForm]} onChange={(e) => setEstForm({ ...estForm, [key]: e.target.value })} /></Grid>)}</Grid><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}><Button variant="contained" disabled={!selected} onClick={() => editingEstId ? updateEstablishment.mutate() : createEstablishment.mutate()}>{editingEstId ? 'Guardar cambios' : 'Alta de establecimiento'}</Button>{editingEstId && <Button onClick={() => { setEditingEstId(''); setEstForm({ nombre: '', codigo: '', direccion: '', sectores: '' }); }}>Cancelar</Button>}</Stack><Stack spacing={1} sx={{ mt: 3 }}>{establishments.data?.map((item) => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}><Box><Typography>{item.nombre}</Typography><Typography variant="caption">{item.direccion || 'Sin dirección'} · {item.sectores || 'Sin sectores'}</Typography></Box><Stack direction="row" spacing={1}><Button size="small" onClick={() => startEstablishmentEdit(item)}>Editar</Button><Chip label={item.activo ? 'Activo' : 'Inactivo'} color={item.activo ? 'success' : 'default'} onClick={() => administracionApi.updateEstablishment(selected!.id, item.id, { activo: !item.activo }).then(invalidate).catch(() => showError('No se pudo cambiar el estado'))} /></Stack></Stack>)}</Stack></CardContent></Card>}

    {tab === 3 && <Grid container spacing={2}><Grid item xs={12} md={6}><Card><CardContent><Typography variant="h6">Miembros</Typography><Stack spacing={2} sx={{ mt: 2 }}><TextField {...field} label="Email de usuario existente" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} /><FormControl {...field}><InputLabel>Rol organizacional</InputLabel><Select value={memberForm.rol} label="Rol organizacional" onChange={(e) => setMemberForm({ ...memberForm, rol: e.target.value as RolOrganizacion })}><MenuItem value="AUDITOR_ORGANIZACION">Auditor</MenuItem><MenuItem value="ADMIN_ORGANIZACION">Administrador</MenuItem></Select></FormControl><Button variant="contained" onClick={() => addMember.mutate()}>Incorporar miembro</Button></Stack><Divider sx={{ my: 2 }} />{members.data?.map((member) => <Stack key={member.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}><Box><Typography>{member.usuario.nombre} {member.usuario.apellido}</Typography><Typography variant="caption">{member.usuario.email} · {member.rol}</Typography></Box><Chip label={member.activa ? 'Activo' : 'Revocado'} color={member.activa ? 'success' : 'default'} onClick={() => member.activa && administracionApi.revokeMember(member.id).then(invalidate).catch(() => showError('No se pudo revocar'))} /></Stack>)}</CardContent></Card></Grid><Grid item xs={12} md={6}><Card><CardContent><Typography variant="h6">Asignar técnico a empresa</Typography><FormControl {...field} sx={{ mt: 2 }}><InputLabel>Empresa cliente</InputLabel><Select value={selected?.id || ''} label="Empresa cliente" onChange={(e) => setCompanyId(e.target.value)}>{companies.data?.map((item) => <MenuItem key={item.id} value={item.id}>{item.empresa.nombre}</MenuItem>)}</Select></FormControl><FormControl {...field} sx={{ mt: 2 }}><InputLabel>Miembro</InputLabel><Select value={assignmentMember} label="Miembro" onChange={(e) => setAssignmentMember(e.target.value)}>{members.data?.filter((m) => m.activa).map((m) => <MenuItem key={m.id} value={m.id}>{m.usuario.nombre} {m.usuario.apellido}</MenuItem>)}</Select></FormControl><Button sx={{ mt: 2 }} variant="contained" disabled={!selected || !assignmentMember} onClick={() => assign.mutate()}>Asignar técnico</Button><Divider sx={{ my: 2 }} />{assignments.data?.map((access: AccessRow) => <Stack key={access.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}><Typography>{access.organizacionMiembro.usuario.nombre} {access.organizacionMiembro.usuario.apellido}</Typography><Stack direction="row" spacing={1} alignItems="center"><Chip label={access.activo ? access.rol : 'Revocado'} color={access.activo ? 'success' : 'default'} /><Button size="small" color="error" disabled={!access.activo} onClick={() => setSelectedAccess(access)}>Revocar</Button></Stack></Stack>)}</CardContent></Card></Grid></Grid>}

    <ConfirmDialog open={!!selectedAccess} title="Revocar asignación" message={`El técnico ${selectedAccess?.organizacionMiembro.usuario.nombre || ''} perderá el acceso a esta empresa y sus establecimientos. ¿Continuar?`} confirmLabel="Revocar" confirmColor="error" isLoading={revokeAccess.isPending} onCancel={() => setSelectedAccess(null)} onConfirm={() => revokeAccess.mutate()} />
  </Box>;
}
