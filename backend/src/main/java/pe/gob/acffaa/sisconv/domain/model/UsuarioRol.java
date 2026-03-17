package pe.gob.acffaa.sisconv.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * TBL_USUARIO_ROL — Tabla puente asignación N:M usuarios-roles
 * AF §7.2 Nivel 1: Seguridad (RBAC)
 */
@Entity
@Table(name = "TBL_USUARIO_ROL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioRol {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_usuario_rol")
    @SequenceGenerator(name = "seq_usuario_rol", sequenceName = "SEQ_USUARIO_ROL", allocationSize = 1)
    @Column(name = "ID_USUARIO_ROL")
    private Long idUsuarioRol;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_USUARIO", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ID_ROL", nullable = false)
    private Rol rol;

    @Column(name = "FECHA_ASIGNACION", nullable = false)
    @Builder.Default
    private LocalDateTime fechaAsignacion = LocalDateTime.now();

    @Column(name = "ESTADO", nullable = false, length = 20)
    @Builder.Default
    private String estado = "ACTIVO";
}
