package com.heartme.userservice.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.heartme.userservice.model.Folder;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    List<Folder> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    void deleteByUserId(UUID userId);
}
